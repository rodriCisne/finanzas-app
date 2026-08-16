import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  crearTelemetriaEjecucionAgente,
  guardarInteraccionAgente,
} from '@/lib/agente-financiero/telemetria';

describe('persistencia de telemetría del agente', () => {
  it('mapea una interacción al contrato de la tabla', async () => {
    const insert = vi.fn(async () => ({ error: null }));
    const supabase = {
      from: vi.fn(() => ({ insert })),
    } as unknown as SupabaseClient;
    const telemetria = crearTelemetriaEjecucionAgente('gpt-5.6-luna');
    telemetria.tokensEntrada = 100;
    telemetria.tokensSalida = 25;
    telemetria.tokensCacheados = 40;
    telemetria.tokensEscrituraCache = 10;
    telemetria.tokensTotales = 125;
    telemetria.cantidadLlamadasModelo = 2;
    telemetria.costoEstimadoUsd = 0.0000345;

    const guardada = await guardarInteraccionAgente(supabase, {
      requestId: '7ea1a8fb-a311-423d-b050-a0cd6f66a5d7',
      usuarioId: 'f55274b2-f653-4de9-bf98-4734106aec87',
      billeteraId: '9bd17799-f566-4b52-a08f-3ebd9a1040c8',
      pregunta: '¿Cuánto gasté hoy?',
      respuesta: 'Gastaste ARS 100.',
      estado: 'completada',
      codigoError: null,
      iniciadaEn: '2026-08-15T12:00:00.000Z',
      finalizadaEn: '2026-08-15T12:00:01.250Z',
      duracionMs: 1250,
      telemetria,
    });

    expect(guardada).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        pregunta: '¿Cuánto gasté hoy?',
        respuesta: 'Gastaste ARS 100.',
        modelo: 'gpt-5.6-luna',
        duracion_ms: 1250,
        tokens_entrada: 100,
        tokens_salida: 25,
        tokens_cacheados: 40,
        tokens_escritura_cache: 10,
        tokens_totales: 125,
        cantidad_llamadas_modelo: 2,
        costo_estimado_usd: '0.0000345000',
        tarifa_version: 'openai-gpt-5.6-luna-2026-08-15',
      })
    );
  });

  it('no propaga un error de Supabase al flujo del agente', async () => {
    const supabase = {
      from: () => ({
        insert: async () => ({ error: new Error('tabla no disponible') }),
      }),
    } as unknown as SupabaseClient;

    const guardada = await guardarInteraccionAgente(supabase, {
      requestId: '7ea1a8fb-a311-423d-b050-a0cd6f66a5d7',
      usuarioId: 'f55274b2-f653-4de9-bf98-4734106aec87',
      billeteraId: '9bd17799-f566-4b52-a08f-3ebd9a1040c8',
      pregunta: 'Consulta',
      respuesta: null,
      estado: 'error',
      codigoError: 'error_interno',
      iniciadaEn: '2026-08-15T12:00:00.000Z',
      finalizadaEn: '2026-08-15T12:00:01.000Z',
      duracionMs: 1000,
      telemetria: crearTelemetriaEjecucionAgente('gpt-5.6-luna'),
    });

    expect(guardada).toBe(false);
  });
});
