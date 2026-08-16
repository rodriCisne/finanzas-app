import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResponseUsage } from 'openai/resources/responses/responses';

const TARIFA_LUNA = {
  modelo: 'gpt-5.6-luna',
  version: 'openai-gpt-5.6-luna-2026-08-15',
  entradaUsdPorMillon: 0.2,
  entradaCacheadaUsdPorMillon: 0.02,
  escrituraCacheUsdPorMillon: 0.25,
  salidaUsdPorMillon: 1.2,
  umbralContextoExtendido: 272_000,
} as const;

export interface LlamadaHerramientaAgente {
  orden: number;
  nombre: string;
  argumentos: unknown;
  iniciadaEn: string;
  finalizadaEn: string;
  duracionMs: number;
  estado: 'completada' | 'error';
}

export interface TelemetriaEjecucionAgente {
  modelo: string;
  tokensEntrada: number;
  tokensSalida: number;
  tokensCacheados: number;
  tokensEscrituraCache: number;
  tokensTotales: number;
  cantidadLlamadasModelo: number;
  costoEstimadoUsd: number | null;
  tarifaVersion: string | null;
  llamadasHerramientas: LlamadaHerramientaAgente[];
}

export interface InteraccionAgente {
  requestId: string;
  usuarioId: string;
  billeteraId: string;
  pregunta: string;
  respuesta: string | null;
  estado: 'completada' | 'error';
  codigoError: string | null;
  iniciadaEn: string;
  finalizadaEn: string;
  duracionMs: number;
  telemetria: TelemetriaEjecucionAgente;
}

export function crearTelemetriaEjecucionAgente(
  modelo: string
): TelemetriaEjecucionAgente {
  return {
    modelo,
    tokensEntrada: 0,
    tokensSalida: 0,
    tokensCacheados: 0,
    tokensEscrituraCache: 0,
    tokensTotales: 0,
    cantidadLlamadasModelo: 0,
    costoEstimadoUsd: modelo === TARIFA_LUNA.modelo ? 0 : null,
    tarifaVersion:
      modelo === TARIFA_LUNA.modelo ? TARIFA_LUNA.version : null,
    llamadasHerramientas: [],
  };
}

export function acumularUsoModelo(
  telemetria: TelemetriaEjecucionAgente,
  uso: ResponseUsage
) {
  const tokensCacheados = uso.input_tokens_details.cached_tokens;
  const tokensEscrituraCache =
    uso.input_tokens_details.cache_write_tokens ?? 0;

  telemetria.tokensEntrada += uso.input_tokens;
  telemetria.tokensSalida += uso.output_tokens;
  telemetria.tokensCacheados += tokensCacheados;
  telemetria.tokensEscrituraCache += tokensEscrituraCache;
  telemetria.tokensTotales += uso.total_tokens;

  if (
    telemetria.modelo !== TARIFA_LUNA.modelo ||
    telemetria.costoEstimadoUsd === null
  ) {
    return;
  }

  const tokensEntradaSinCache = Math.max(
    0,
    uso.input_tokens - tokensCacheados - tokensEscrituraCache
  );
  const contextoExtendido =
    uso.input_tokens > TARIFA_LUNA.umbralContextoExtendido;
  const multiplicadorEntrada = contextoExtendido ? 2 : 1;
  const multiplicadorSalida = contextoExtendido ? 1.5 : 1;
  const costoEntrada =
    ((tokensEntradaSinCache * TARIFA_LUNA.entradaUsdPorMillon +
      tokensCacheados * TARIFA_LUNA.entradaCacheadaUsdPorMillon +
      tokensEscrituraCache * TARIFA_LUNA.escrituraCacheUsdPorMillon) *
      multiplicadorEntrada) /
    1_000_000;
  const costoSalida =
    (uso.output_tokens *
      TARIFA_LUNA.salidaUsdPorMillon *
      multiplicadorSalida) /
    1_000_000;

  telemetria.costoEstimadoUsd += costoEntrada + costoSalida;
}

export async function guardarInteraccionAgente(
  supabase: SupabaseClient,
  interaccion: InteraccionAgente
): Promise<boolean> {
  try {
    const { error } = await supabase.from('interacciones_agente').insert({
      request_id: interaccion.requestId,
      usuario_id: interaccion.usuarioId,
      billetera_id: interaccion.billeteraId,
      pregunta: interaccion.pregunta,
      respuesta: interaccion.respuesta,
      modelo: interaccion.telemetria.modelo,
      estado: interaccion.estado,
      codigo_error: interaccion.codigoError,
      iniciada_en: interaccion.iniciadaEn,
      finalizada_en: interaccion.finalizadaEn,
      duracion_ms: interaccion.duracionMs,
      tokens_entrada: interaccion.telemetria.tokensEntrada,
      tokens_salida: interaccion.telemetria.tokensSalida,
      tokens_cacheados: interaccion.telemetria.tokensCacheados,
      tokens_escritura_cache: interaccion.telemetria.tokensEscrituraCache,
      tokens_totales: interaccion.telemetria.tokensTotales,
      cantidad_llamadas_modelo:
        interaccion.telemetria.cantidadLlamadasModelo,
      costo_estimado_usd:
        interaccion.telemetria.costoEstimadoUsd === null
          ? null
          : interaccion.telemetria.costoEstimadoUsd.toFixed(10),
      tarifa_version: interaccion.telemetria.tarifaVersion,
      llamadas_herramientas: interaccion.telemetria.llamadasHerramientas,
    });

    return !error;
  } catch {
    return false;
  }
}
