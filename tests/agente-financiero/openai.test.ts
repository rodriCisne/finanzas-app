import { describe, expect, it, vi } from 'vitest';
import type {
  Response,
  ResponseOutputItem,
} from 'openai/resources/responses/responses';
import {
  ejecutarAgenteFinanciero,
  type ClienteRespuestas,
} from '@/lib/agente-financiero/openai';
import type { RepositorioFinanciero } from '@/lib/agente-financiero/contratos';
import { crearTelemetriaEjecucionAgente } from '@/lib/agente-financiero/telemetria';

function crearRespuesta(
  output: ResponseOutputItem[],
  outputText = '',
  uso?: {
    entrada: number;
    salida: number;
    cacheados: number;
    escrituraCache?: number;
  }
): Response {
  return {
    output,
    output_text: outputText,
    usage: uso
      ? {
          input_tokens: uso.entrada,
          output_tokens: uso.salida,
          total_tokens: uso.entrada + uso.salida,
          input_tokens_details: {
            cached_tokens: uso.cacheados,
            cache_write_tokens: uso.escrituraCache ?? 0,
          },
          output_tokens_details: { reasoning_tokens: 0 },
        }
      : null,
  } as unknown as Response;
}

function crearRepositorio(): RepositorioFinanciero {
  return {
    listarTransacciones: vi.fn(async () => [
      {
        fecha: '2026-08-15',
        tipo: 'expense' as const,
        importe: '125.50',
        moneda: 'ARS',
        categoria: 'Comida',
        creador: 'Rodri',
        nota: null,
      },
    ]),
    buscarTransacciones: vi.fn(async () => ({
      transacciones: [],
      hayMas: false,
    })),
  };
}

function llamadaResumen(numero: number): ResponseOutputItem {
  return {
    type: 'function_call',
    call_id: `call_${numero}`,
    name: 'obtener_resumen',
    arguments: JSON.stringify({
      desde: '2026-08-15',
      hasta: '2026-08-15',
    }),
  };
}

function llamadaGastosPorPersona(): ResponseOutputItem {
  return {
    type: 'function_call',
    call_id: 'call_personas',
    name: 'obtener_gastos_por_persona',
    arguments: JSON.stringify({
      desde: '2026-01-01',
      hasta: '2026-08-31',
      agrupacion: 'mes',
    }),
  };
}

describe('orquestador OpenAI', () => {
  it('ejecuta una herramienta local y devuelve la respuesta estructurada', async () => {
    const telemetria = crearTelemetriaEjecucionAgente('gpt-5.6-luna');
    const crear = vi
      .fn<ClienteRespuestas['crear']>()
      .mockResolvedValueOnce(
        crearRespuesta([llamadaResumen(1)], '', {
          entrada: 100,
          salida: 20,
          cacheados: 40,
          escrituraCache: 10,
        })
      )
      .mockResolvedValueOnce(
        crearRespuesta(
          [],
          JSON.stringify({
            respuesta: 'Gastaste ARS 125,50 el 15 de agosto.',
            periodosConsultados: [
              {
                desde: '2026-08-15',
                hasta: '2026-08-15',
                etiqueta: '15 de agosto',
              },
            ],
          }),
          {
            entrada: 150,
            salida: 30,
            cacheados: 80,
            escrituraCache: 20,
          }
        )
      );

    const resultado = await ejecutarAgenteFinanciero({
      cliente: { crear },
      repositorio: crearRepositorio(),
      pregunta: '¿Cuánto gasté hoy?',
      fechaActual: '2026-08-15',
      telemetria,
    });

    expect(resultado.respuesta).toContain('ARS 125,50');
    expect(crear).toHaveBeenCalledTimes(2);

    const primeraSolicitud = crear.mock.calls[0][0];
    expect(primeraSolicitud.model).toBe('gpt-5.6-luna');
    expect(primeraSolicitud.store).toBe(false);
    expect(primeraSolicitud.parallel_tool_calls).toBe(false);

    const segundaSolicitud = crear.mock.calls[1][0];
    expect(JSON.stringify(segundaSolicitud.input)).toContain('125.50');
    expect(JSON.stringify(segundaSolicitud.input)).toContain('ARS');
    expect(telemetria).toMatchObject({
      tokensEntrada: 250,
      tokensSalida: 50,
      tokensCacheados: 120,
      tokensEscrituraCache: 30,
      tokensTotales: 300,
      cantidadLlamadasModelo: 2,
      costoEstimadoUsd: 0.0000899,
      tarifaVersion: 'openai-gpt-5.6-luna-2026-08-15',
    });
    expect(telemetria.llamadasHerramientas).toHaveLength(1);
    expect(telemetria.llamadasHerramientas[0]).toMatchObject({
      orden: 1,
      nombre: 'obtener_resumen',
      argumentos: { desde: '2026-08-15', hasta: '2026-08-15' },
      estado: 'completada',
    });
  });

  it('recorta el historial enviado a los últimos ocho mensajes', async () => {
    const crear = vi
      .fn<ClienteRespuestas['crear']>()
      .mockResolvedValue(
        crearRespuesta(
          [],
          JSON.stringify({
            respuesta: 'Necesito que indiques un período.',
            periodosConsultados: [],
          })
        )
      );
    const historial = Array.from({ length: 10 }, (_, indice) => ({
      rol: (indice % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      contenido: `mensaje-${indice}`,
    }));

    await ejecutarAgenteFinanciero({
      cliente: { crear },
      repositorio: crearRepositorio(),
      pregunta: 'Consulta actual',
      historial,
      fechaActual: '2026-08-15',
    });

    const entrada = JSON.stringify(crear.mock.calls[0][0].input);
    expect(entrada).not.toContain('mensaje-0');
    expect(entrada).not.toContain('mensaje-1');
    expect(entrada).toContain('mensaje-2');
    expect(entrada).toContain('Consulta actual');
  });

  it('expone y ejecuta la herramienta determinística por persona', async () => {
    const crear = vi
      .fn<ClienteRespuestas['crear']>()
      .mockResolvedValueOnce(crearRespuesta([llamadaGastosPorPersona()]))
      .mockResolvedValueOnce(
        crearRespuesta(
          [],
          JSON.stringify({
            respuesta: '| Mes | Rodri |\n|---|---:|\n| Agosto | ARS 125,50 |',
            periodosConsultados: [],
          })
        )
      );

    await ejecutarAgenteFinanciero({
      cliente: { crear },
      repositorio: crearRepositorio(),
      pregunta: '¿Cuánto gastó Rodri por mes?',
      fechaActual: '2026-08-15',
    });

    const primeraSolicitud = crear.mock.calls[0][0];
    expect(
      primeraSolicitud.tools?.some(
        (herramienta) =>
          herramienta.type === 'function' &&
          herramienta.name === 'obtener_gastos_por_persona'
      )
    ).toBe(true);
    expect(JSON.stringify(crear.mock.calls[1][0].input)).toContain('Rodri');
  });

  it('detiene el ciclo antes de ejecutar una séptima herramienta', async () => {
    const crear = vi.fn<ClienteRespuestas['crear']>();
    for (let numero = 1; numero <= 7; numero += 1) {
      crear.mockResolvedValueOnce(crearRespuesta([llamadaResumen(numero)]));
    }
    const repositorio = crearRepositorio();

    await expect(
      ejecutarAgenteFinanciero({
        cliente: { crear },
        repositorio,
        pregunta: 'Repetí muchas consultas',
        fechaActual: '2026-08-15',
      })
    ).rejects.toThrow('límite');

    expect(crear).toHaveBeenCalledTimes(7);
    expect(repositorio.listarTransacciones).toHaveBeenCalledTimes(6);
  });

  it('rechaza una salida final que no respeta el contrato', async () => {
    const crear = vi
      .fn<ClienteRespuestas['crear']>()
      .mockResolvedValue(crearRespuesta([], '{"texto":"sin contrato"}'));

    await expect(
      ejecutarAgenteFinanciero({
        cliente: { crear },
        repositorio: crearRepositorio(),
        pregunta: 'Hola',
        fechaActual: '2026-08-15',
      })
    ).rejects.toThrow();
  });
});
