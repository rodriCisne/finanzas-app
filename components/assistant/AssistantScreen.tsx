'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Bot, Send, Wallet } from 'lucide-react';
import { useWallets } from '@/components/WalletContext';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/cn';
import { RespuestaMarkdown } from './RespuestaMarkdown';

type PeriodoConsultado = {
  desde: string;
  hasta: string;
  etiqueta: string | null;
};

type Mensaje = {
  id: string;
  rol: 'user' | 'assistant';
  contenido: string;
  periodos?: PeriodoConsultado[];
};

type Intento = {
  pregunta: string;
  historial: { rol: 'user' | 'assistant'; contenido: string }[];
  walletId: string;
};

const PREGUNTAS_SUGERIDAS = [
  '¿Cuánto gasté ayer?',
  'Mostrame los gastos de este mes',
  'Compará el mes pasado con este mes',
  '¿En qué categorías gasté más este mes?',
];

function crearId() {
  return crypto.randomUUID();
}

function formatearFecha(fecha: string) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR').format(new Date(anio, mes - 1, dia));
}

function etiquetaPeriodo(periodo: PeriodoConsultado) {
  if (periodo.etiqueta) return periodo.etiqueta;
  const desde = formatearFecha(periodo.desde);
  const hasta = formatearFecha(periodo.hasta);
  return desde === hasta ? desde : `${desde}–${hasta}`;
}

function obtenerHistorialCompletado(mensajes: readonly Mensaje[]) {
  const historial: { rol: 'user' | 'assistant'; contenido: string }[] = [];

  for (let indice = 0; indice < mensajes.length - 1; indice += 1) {
    const actual = mensajes[indice];
    const siguiente = mensajes[indice + 1];
    if (actual.rol === 'user' && siguiente.rol === 'assistant') {
      historial.push(
        { rol: actual.rol, contenido: actual.contenido },
        { rol: siguiente.rol, contenido: siguiente.contenido }
      );
      indice += 1;
    }
  }

  return historial.slice(-8);
}

export function AssistantScreen() {
  const { currentWallet, currentWalletId, loading: cargandoBilletera } =
    useWallets();
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [borrador, setBorrador] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ultimoIntento, setUltimoIntento] = useState<Intento | null>(null);
  const controladorRef = useRef<AbortController | null>(null);
  const billeteraAnteriorRef = useRef<string | null>(currentWalletId);
  const billeteraActualRef = useRef<string | null>(currentWalletId);
  const finConversacionRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  billeteraActualRef.current = currentWalletId;

  useEffect(() => {
    if (billeteraAnteriorRef.current === currentWalletId) return;
    billeteraAnteriorRef.current = currentWalletId;
    controladorRef.current?.abort();
    setMensajes([]);
    setBorrador('');
    setError(null);
    setUltimoIntento(null);
    setEnviando(false);
  }, [currentWalletId]);

  useEffect(() => () => controladorRef.current?.abort(), []);

  useEffect(() => {
    if (mensajes.length === 0 && !enviando) return;
    const movimientoReducido = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    finConversacionRef.current?.scrollIntoView({
      behavior: movimientoReducido ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [mensajes, enviando]);

  async function ejecutarIntento(intento: Intento, agregarMensaje: boolean) {
    if (enviando) return;

    const controlador = new AbortController();
    controladorRef.current?.abort();
    controladorRef.current = controlador;
    setEnviando(true);
    setError(null);
    setUltimoIntento(intento);

    if (agregarMensaje) {
      setMensajes((actuales) => [
        ...actuales,
        { id: crearId(), rol: 'user', contenido: intento.pregunta },
      ]);
    }

    try {
      const { data, error: errorSesion } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (errorSesion || !token) throw new Error('sesion');

      const respuesta = await fetch('/api/financial-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pregunta: intento.pregunta,
          walletId: intento.walletId,
          historial: intento.historial,
        }),
        signal: controlador.signal,
      });

      if (!respuesta.ok) {
        if (respuesta.status === 401) {
          await supabase.auth.signOut();
          throw new Error('sesion');
        }
        if (respuesta.status === 403) throw new Error('billetera');
        if (respuesta.status === 429) throw new Error('limite');
        throw new Error('proveedor');
      }

      const resultado = (await respuesta.json()) as {
        respuesta: string;
        periodosConsultados: PeriodoConsultado[];
      };

      if (billeteraActualRef.current !== intento.walletId) return;

      setMensajes((actuales) => [
        ...actuales,
        {
          id: crearId(),
          rol: 'assistant',
          contenido: resultado.respuesta,
          periodos: resultado.periodosConsultados,
        },
      ]);
      setBorrador('');
      setUltimoIntento(null);
      requestAnimationFrame(() => textareaRef.current?.focus());
    } catch (errorCapturado: unknown) {
      if (controlador.signal.aborted) return;

      const codigo =
        errorCapturado instanceof Error ? errorCapturado.message : 'proveedor';
      const mensajesError: Record<string, string> = {
        sesion: 'Tu sesión venció. Volvé a iniciar sesión.',
        billetera: 'Ya no tenés acceso a esta billetera.',
        limite: 'Hay muchas consultas en este momento. Probá en unos minutos.',
        proveedor: 'No pude completar la consulta. Podés reintentar.',
      };
      setError(mensajesError[codigo] ?? mensajesError.proveedor);
    } finally {
      if (controladorRef.current === controlador) {
        controladorRef.current = null;
        setEnviando(false);
      }
    }
  }

  function enviarPregunta(pregunta: string) {
    const preguntaLimpia = pregunta.trim();
    if (!preguntaLimpia || !currentWallet || enviando) return;

    const historial = obtenerHistorialCompletado(mensajes);
    void ejecutarIntento(
      { pregunta: preguntaLimpia, historial, walletId: currentWallet.id },
      true
    );
  }

  if (cargandoBilletera) {
    return (
      <main className="flex h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] flex-col gap-4 px-4 py-5" aria-busy="true">
        <div className="h-16 rounded-xl bg-slate-900" />
        <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/40" />
        <div className="h-16 rounded-xl bg-slate-900" />
      </main>
    );
  }

  if (!currentWallet) {
    return (
      <main className="flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center gap-4 px-6 text-center">
        <Wallet aria-hidden="true" className="size-10 text-slate-500" />
        <div>
          <h1 className="text-balance text-xl font-semibold">Elegí una billetera</h1>
          <p className="mt-2 text-pretty text-sm text-slate-400">
            El asistente necesita una billetera activa para consultar tus movimientos.
          </p>
        </div>
        <Link
          href="/wallets"
          className="inline-flex min-h-11 items-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
        >
          Elegir o crear billetera
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-5rem-env(safe-area-inset-bottom))] flex-col">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-balance text-xl font-semibold">Asistente</h1>
            <p className="text-pretty text-xs text-slate-400">
              Consultá tus finanzas con lenguaje natural
            </p>
          </div>
          <Link
            href="/wallets"
            className="max-w-40 truncate rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
            title={currentWallet.name}
          >
            {currentWallet.name}
          </Link>
        </div>
      </header>

      <section
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-busy={enviando}
        className="custom-scrollbar flex-1 overflow-y-auto px-4 py-5"
      >
        {mensajes.length === 0 ? (
          <div className="flex min-h-full flex-col items-center justify-center gap-5 text-center">
            <Bot aria-hidden="true" className="size-10 text-emerald-400" />
            <div>
              <h2 className="text-balance font-semibold">¿Qué querés consultar?</h2>
              <p className="mt-2 max-w-xs text-pretty text-sm text-slate-400">
                Puedo leer movimientos, resumir períodos y comparar gastos. No puedo modificar datos.
              </p>
            </div>
            <div className="flex max-w-sm flex-wrap justify-center gap-2">
              {PREGUNTAS_SUGERIDAS.map((pregunta) => (
                <button
                  key={pregunta}
                  type="button"
                  onClick={() => enviarPregunta(pregunta)}
                  disabled={enviando}
                  className="min-h-11 rounded-xl border border-slate-700 px-3 py-2 text-left text-xs text-slate-300 hover:border-slate-600 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-50"
                >
                  {pregunta}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-4">
            {mensajes.map((mensaje) => (
              <li
                key={mensaje.id}
                className={cn('flex', mensaje.rol === 'user' && 'justify-end')}
              >
                <div
                  className={cn(
                    'max-w-[88%] rounded-2xl px-4 py-3 text-pretty text-sm',
                    mensaje.rol === 'user'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'border border-slate-800 bg-slate-900 text-slate-100'
                  )}
                >
                  {mensaje.rol === 'assistant' ? (
                    <RespuestaMarkdown contenido={mensaje.contenido} />
                  ) : (
                    <p className="whitespace-pre-wrap">{mensaje.contenido}</p>
                  )}
                  {mensaje.periodos && mensaje.periodos.length > 0 ? (
                    <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-400">
                      {mensaje.periodos.map((periodo) => (
                        <p
                          key={`${periodo.desde}-${periodo.hasta}`}
                          className="tabular-nums"
                        >
                          Período: {etiquetaPeriodo(periodo)}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
            {enviando ? (
              <li className="flex" role="status">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
                  Consultando…
                </div>
              </li>
            ) : null}
          </ol>
        )}
        <div ref={finConversacionRef} />
      </section>

      <div className="border-t border-slate-800 bg-slate-950 px-4 py-3">
        {error ? (
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-red-300" role="alert">
            <span>{error}</span>
            {ultimoIntento ? (
              <button
                type="button"
                onClick={() => void ejecutarIntento(ultimoIntento, false)}
                className="min-h-11 shrink-0 px-2 font-semibold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                Reintentar
              </button>
            ) : null}
          </div>
        ) : null}
        <form
          onSubmit={(evento) => {
            evento.preventDefault();
            enviarPregunta(borrador);
          }}
          className="flex items-end gap-2"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="pregunta-asistente" className="sr-only">
              Pregunta para el asistente
            </label>
            <textarea
              ref={textareaRef}
              id="pregunta-asistente"
              value={borrador}
              onChange={(evento) => setBorrador(evento.target.value.slice(0, 1_000))}
              onKeyDown={(evento) => {
                if (
                  evento.key === 'Enter' &&
                  !evento.shiftKey &&
                  !evento.nativeEvent.isComposing
                ) {
                  evento.preventDefault();
                  enviarPregunta(borrador);
                }
              }}
              disabled={enviando}
              rows={1}
              maxLength={1_000}
              placeholder="Ej.: ¿Cuánto gasté del 1 al 15?"
              className="max-h-28 min-h-11 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-60"
            />
            {borrador.length >= 900 ? (
              <p className="mt-1 text-right text-xs tabular-nums text-slate-500">
                {borrador.length}/1000
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            aria-label="Enviar pregunta"
            disabled={enviando || borrador.trim().length === 0}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send aria-hidden="true" className="size-5" />
          </button>
        </form>
        <p className="mt-2 text-pretty text-center text-[10px] text-slate-500">
          Respuestas informativas; no constituyen asesoramiento profesional.
        </p>
      </div>
    </main>
  );
}
