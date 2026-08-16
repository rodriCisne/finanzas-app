import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import {
  crearClienteRespuestasOpenAI,
  ejecutarAgenteFinanciero,
  obtenerModeloAgente,
} from '@/lib/agente-financiero/openai';
import { crearRepositorioFinancieroSupabase } from '@/lib/agente-financiero/repositorio-supabase';
import { crearClienteSupabaseUsuario } from '@/lib/agente-financiero/supabase-servidor';
import {
  esquemaSolicitudAgente,
  extraerTokenBearer,
} from '@/lib/agente-financiero/solicitud';
import {
  crearTelemetriaEjecucionAgente,
  guardarInteraccionAgente,
  type InteraccionAgente,
} from '@/lib/agente-financiero/telemetria';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CABECERAS_PRIVADAS = {
  'Cache-Control': 'private, no-store',
};

function respuestaError(mensaje: string, estado: number) {
  return NextResponse.json(
    { error: mensaje },
    { status: estado, headers: CABECERAS_PRIVADAS }
  );
}

function crearAbortSignal(requestSignal: AbortSignal) {
  const controlador = new AbortController();
  const abortarPorCliente = () => controlador.abort(requestSignal.reason);
  const temporizador = setTimeout(
    () => controlador.abort(new Error('Tiempo de espera agotado.')),
    55_000
  );

  if (requestSignal.aborted) abortarPorCliente();
  else requestSignal.addEventListener('abort', abortarPorCliente, { once: true });

  return {
    signal: controlador.signal,
    limpiar: () => {
      clearTimeout(temporizador);
      requestSignal.removeEventListener('abort', abortarPorCliente);
    },
  };
}

export async function POST(request: Request) {
  const inicio = Date.now();
  const iniciadaEn = new Date();
  const requestId = crypto.randomUUID();
  const telemetria = crearTelemetriaEjecucionAgente(obtenerModeloAgente());
  const token = extraerTokenBearer(request.headers.get('authorization'));

  if (!token) return respuestaError('Tu sesión no es válida.', 401);

  let cuerpo: unknown;
  try {
    cuerpo = await request.json();
  } catch {
    return respuestaError('La solicitud no contiene JSON válido.', 400);
  }

  const solicitud = esquemaSolicitudAgente.safeParse(cuerpo);
  if (!solicitud.success) {
    return respuestaError('La pregunta o sus datos no son válidos.', 400);
  }

  const cancelacion = crearAbortSignal(request.signal);
  let contextoPersistencia:
    | {
        supabase: SupabaseClient;
        usuarioId: string;
        billeteraId: string;
      }
    | undefined;

  const persistir = async (
    datos: Pick<InteraccionAgente, 'respuesta' | 'estado' | 'codigoError'>
  ) => {
    if (!contextoPersistencia) return;

    const finalizadaEn = new Date();
    const guardada = await guardarInteraccionAgente(
      contextoPersistencia.supabase,
      {
        requestId,
        usuarioId: contextoPersistencia.usuarioId,
        billeteraId: contextoPersistencia.billeteraId,
        pregunta: solicitud.data.pregunta,
        iniciadaEn: iniciadaEn.toISOString(),
        finalizadaEn: finalizadaEn.toISOString(),
        duracionMs: Math.max(0, finalizadaEn.getTime() - iniciadaEn.getTime()),
        telemetria,
        ...datos,
      }
    );

    if (!guardada) {
      console.warn('financial_agent_telemetry_error', { requestId });
    }
  };

  try {
    const supabase = crearClienteSupabaseUsuario(token);
    const { data: usuario, error: errorAutenticacion } =
      await supabase.auth.getUser(token);

    if (errorAutenticacion || !usuario.user) {
      return respuestaError('Tu sesión venció. Volvé a iniciar sesión.', 401);
    }

    let consultaBilletera = supabase
      .from('wallets')
      .select('id,name,default_currency_code')
      .eq('id', solicitud.data.walletId);
    consultaBilletera = consultaBilletera.abortSignal(cancelacion.signal);

    const { data: billetera, error: errorBilletera } =
      await consultaBilletera.maybeSingle();
    if (errorBilletera) {
      throw new Error('No se pudo verificar la billetera.');
    }
    if (!billetera) {
      return respuestaError('No tenés acceso a esa billetera.', 403);
    }

    contextoPersistencia = {
      supabase,
      usuarioId: usuario.user.id,
      billeteraId: billetera.id,
    };

    const repositorio = crearRepositorioFinancieroSupabase(
      supabase,
      billetera.id,
      cancelacion.signal
    );
    const cliente = crearClienteRespuestasOpenAI();
    const resultado = await ejecutarAgenteFinanciero({
      cliente,
      repositorio,
      pregunta: solicitud.data.pregunta,
      historial: solicitud.data.historial,
      signal: cancelacion.signal,
      telemetria,
    });

    await persistir({
      respuesta: resultado.respuesta,
      estado: 'completada',
      codigoError: null,
    });

    console.info('financial_agent_request', {
      requestId,
      estado: 200,
      duracionMs: Date.now() - inicio,
    });

    return NextResponse.json(resultado, { headers: CABECERAS_PRIVADAS });
  } catch (error: unknown) {
    let estado = 500;
    let codigo = 'error_interno';

    if (error instanceof OpenAI.APIError) {
      if (error.status === 429) {
        estado = 429;
        codigo = 'limite_proveedor';
      } else {
        estado = 502;
        codigo = 'error_proveedor';
      }
    } else if (error instanceof ZodError || error instanceof SyntaxError) {
      estado = 400;
      codigo = 'respuesta_invalida';
    } else if (cancelacion.signal.aborted) {
      estado = 504;
      codigo = 'tiempo_agotado';
    }

    console.error('financial_agent_error', {
      requestId,
      estado,
      codigo,
      duracionMs: Date.now() - inicio,
    });

    await persistir({
      respuesta: null,
      estado: 'error',
      codigoError: codigo,
    });

    const mensaje =
      estado === 429
        ? 'Hay demasiadas consultas en este momento. Probá nuevamente en unos minutos.'
        : estado === 400
          ? 'No pude interpretar la consulta de forma segura.'
          : estado === 504
            ? 'La consulta tardó demasiado. Probá nuevamente.'
            : 'No pude completar la consulta. Probá nuevamente más tarde.';

    return respuestaError(mensaje, estado);
  } finally {
    cancelacion.limpiar();
  }
}
