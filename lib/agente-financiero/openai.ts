import OpenAI from 'openai';
import type {
  FunctionTool,
  Response,
  ResponseCreateParamsNonStreaming,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseReasoningItem,
} from 'openai/resources/responses/responses';
import { z } from 'zod';
import type { RepositorioFinanciero } from './contratos';
import {
  buscarTransacciones,
  compararPeriodos,
  obtenerDistribucionPorCategoria,
  obtenerGastosPorPersona,
  obtenerResumen,
} from './herramientas';
import {
  obtenerFechaEnZonaHoraria,
  ZONA_HORARIA_FINANCIERA,
  type Periodo,
} from './fechas';
import {
  acumularUsoModelo,
  type TelemetriaEjecucionAgente,
} from './telemetria';

const MAXIMO_LLAMADAS_HERRAMIENTAS = 6;
const MAXIMO_TOKENS_SALIDA = 1_200;
const MODELO_PREDETERMINADO = 'gpt-5.6-luna';

export function obtenerModeloAgente(): string {
  return process.env.OPENAI_MODEL ?? MODELO_PREDETERMINADO;
}

export interface MensajeHistorial {
  rol: 'user' | 'assistant';
  contenido: string;
}

export interface ClienteRespuestas {
  crear(
    parametros: ResponseCreateParamsNonStreaming,
    signal?: AbortSignal
  ): Promise<Response>;
}

const esquemaRespuestaAgente = z
  .object({
    respuesta: z.string().trim().min(1).max(4_000),
    periodosConsultados: z
      .array(
        z
          .object({
            desde: z.string(),
            hasta: z.string(),
            etiqueta: z.string().nullable(),
          })
          .strict()
      )
      .max(MAXIMO_LLAMADAS_HERRAMIENTAS * 2),
  })
  .strict();

export type RespuestaAgente = z.infer<typeof esquemaRespuestaAgente>;

const esquemaPeriodoJSON = {
  type: 'object',
  properties: {
    desde: { type: 'string', description: 'Fecha inclusiva YYYY-MM-DD.' },
    hasta: { type: 'string', description: 'Fecha inclusiva YYYY-MM-DD.' },
  },
  required: ['desde', 'hasta'],
  additionalProperties: false,
} as const;

const herramientasOpenAI: FunctionTool[] = [
  {
    type: 'function',
    name: 'obtener_resumen',
    description:
      'Obtiene ingresos, gastos y balance del período, siempre separados por moneda.',
    parameters: esquemaPeriodoJSON,
    strict: true,
  },
  {
    type: 'function',
    name: 'obtener_distribucion_por_categoria',
    description:
      'Agrupa ingresos o gastos por categoría y moneda dentro de un período.',
    parameters: {
      ...esquemaPeriodoJSON,
      properties: {
        ...esquemaPeriodoJSON.properties,
        tipo: { type: 'string', enum: ['income', 'expense'] },
      },
      required: ['desde', 'hasta', 'tipo'],
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'buscar_transacciones',
    description:
      'Busca movimientos concretos. Úsala cuando se necesite listar o localizar transacciones.',
    parameters: {
      type: 'object',
      properties: {
        desde: esquemaPeriodoJSON.properties.desde,
        hasta: esquemaPeriodoJSON.properties.hasta,
        tipo: { type: ['string', 'null'], enum: ['income', 'expense', null] },
        categoria: { type: ['string', 'null'] },
        texto: { type: ['string', 'null'] },
        limite: { type: 'integer', minimum: 1, maximum: 50 },
      },
      required: ['desde', 'hasta', 'tipo', 'categoria', 'texto', 'limite'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'obtener_gastos_por_persona',
    description:
      'Calcula gastos por responsable usando el perfil que creó cada movimiento. Puede agrupar el resultado total o mes a mes. Es la única herramienta válida para responder quién gastó cuánto.',
    parameters: {
      ...esquemaPeriodoJSON,
      properties: {
        ...esquemaPeriodoJSON.properties,
        agrupacion: { type: 'string', enum: ['total', 'mes'] },
      },
      required: ['desde', 'hasta', 'agrupacion'],
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'comparar_periodos',
    description:
      'Compara ingresos, gastos y balances de dos períodos, separados por moneda.',
    parameters: {
      type: 'object',
      properties: {
        desde_a: esquemaPeriodoJSON.properties.desde,
        hasta_a: esquemaPeriodoJSON.properties.hasta,
        desde_b: esquemaPeriodoJSON.properties.desde,
        hasta_b: esquemaPeriodoJSON.properties.hasta,
      },
      required: ['desde_a', 'hasta_a', 'desde_b', 'hasta_b'],
      additionalProperties: false,
    },
    strict: true,
  },
];

function construirInstrucciones(fechaActual: string): string {
  return `Sos un asistente financiero de consulta, en español latinoamericano.
Hoy es ${fechaActual} en la zona horaria ${ZONA_HORARIA_FINANCIERA}.
Solo podés responder sobre datos de la billetera activa usando las herramientas provistas.
Nunca inventes montos ni movimientos. Si la pregunta requiere datos, usá una herramienta.
Para preguntas sobre quién, persona, responsable, Rodri, Vicu o quién creó un gasto, usá obtener_gastos_por_persona. Nunca infieras una persona desde la nota o la categoría.
Interpretá fechas y períodos de forma inclusiva. Si falta un dato indispensable, pedí aclaración.
No combines monedas: ARS, USD u otras deben permanecer separadas y claramente identificadas.
No des asesoramiento financiero profesional ni afirmes haber modificado datos.
La respuesta debe ser breve, clara y mencionar los períodos efectivamente consultados.`;
}

async function ejecutarHerramienta(
  llamada: ResponseFunctionToolCall,
  argumentos: unknown,
  repositorio: RepositorioFinanciero
): Promise<{ salida: unknown; periodos: Periodo[] }> {
  switch (llamada.name) {
    case 'obtener_resumen': {
      const salida = await obtenerResumen(repositorio, argumentos);
      return { salida, periodos: [salida.periodo] };
    }
    case 'obtener_distribucion_por_categoria': {
      const salida = await obtenerDistribucionPorCategoria(
        repositorio,
        argumentos
      );
      return { salida, periodos: [salida.periodo] };
    }
    case 'buscar_transacciones': {
      const salida = await buscarTransacciones(repositorio, argumentos);
      return { salida, periodos: [salida.periodo] };
    }
    case 'obtener_gastos_por_persona': {
      const salida = await obtenerGastosPorPersona(repositorio, argumentos);
      return { salida, periodos: [salida.periodo] };
    }
    case 'comparar_periodos': {
      const salida = await compararPeriodos(repositorio, argumentos);
      return {
        salida,
        periodos: [salida.periodoA.periodo, salida.periodoB.periodo],
      };
    }
    default:
      throw new Error('La herramienta solicitada no está permitida.');
  }
}

function deduplicarPeriodos(periodos: readonly Periodo[]) {
  const unicos = new Map<string, Periodo>();
  for (const periodo of periodos) {
    unicos.set(`${periodo.desde}:${periodo.hasta}`, periodo);
  }

  return [...unicos.values()].map((periodo) => ({
    ...periodo,
    etiqueta: null,
  }));
}

function construirEntradaInicial(
  pregunta: string,
  historial: readonly MensajeHistorial[]
): ResponseInput {
  return [
    ...historial.slice(-8).map((mensaje) => ({
      type: 'message' as const,
      role: mensaje.rol,
      content: mensaje.contenido,
    })),
    { type: 'message', role: 'user', content: pregunta },
  ];
}

export async function ejecutarAgenteFinanciero({
  cliente,
  repositorio,
  pregunta,
  historial = [],
  fechaActual = obtenerFechaEnZonaHoraria(),
  signal,
  telemetria,
}: {
  cliente: ClienteRespuestas;
  repositorio: RepositorioFinanciero;
  pregunta: string;
  historial?: readonly MensajeHistorial[];
  fechaActual?: string;
  signal?: AbortSignal;
  telemetria?: TelemetriaEjecucionAgente;
}): Promise<RespuestaAgente> {
  const entrada: ResponseInput = construirEntradaInicial(pregunta, historial);
  let cantidadLlamadas = 0;
  const periodosEjecutados: Periodo[] = [];

  for (;;) {
    if (telemetria) telemetria.cantidadLlamadasModelo += 1;
    const respuesta = await cliente.crear(
      {
        model: obtenerModeloAgente(),
        instructions: construirInstrucciones(fechaActual),
        input: entrada,
        tools: herramientasOpenAI,
        tool_choice: 'auto',
        parallel_tool_calls: false,
        reasoning: { effort: 'low' },
        text: {
          verbosity: 'low',
          format: {
            type: 'json_schema',
            name: 'respuesta_agente_financiero',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                respuesta: { type: 'string' },
                periodosConsultados: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      desde: { type: 'string' },
                      hasta: { type: 'string' },
                      etiqueta: { type: ['string', 'null'] },
                    },
                    required: ['desde', 'hasta', 'etiqueta'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['respuesta', 'periodosConsultados'],
              additionalProperties: false,
            },
          },
        },
        include: ['reasoning.encrypted_content'],
        max_output_tokens: MAXIMO_TOKENS_SALIDA,
        store: false,
      },
      signal
    );

    if (respuesta.usage && telemetria) {
      acumularUsoModelo(telemetria, respuesta.usage);
    }

    const llamadas = respuesta.output.filter(
      (item): item is ResponseFunctionToolCall => item.type === 'function_call'
    );
    const razonamientos = respuesta.output.filter(
      (item): item is ResponseReasoningItem => item.type === 'reasoning'
    );

    if (llamadas.length === 0) {
      const salidaValidada = esquemaRespuestaAgente.parse(
        JSON.parse(respuesta.output_text)
      );
      return {
        respuesta: salidaValidada.respuesta,
        periodosConsultados: deduplicarPeriodos(periodosEjecutados),
      };
    }

    if (cantidadLlamadas + llamadas.length > MAXIMO_LLAMADAS_HERRAMIENTAS) {
      throw new Error('Se alcanzó el límite de consultas financieras.');
    }

    entrada.push(...razonamientos);

    for (const llamada of llamadas) {
      entrada.push({
        type: 'function_call',
        call_id: llamada.call_id,
        name: llamada.name,
        arguments: llamada.arguments,
      });
      const iniciadaEn = new Date();
      const inicioHerramienta = Date.now();
      let argumentos: unknown = null;
      let estadoHerramienta: 'completada' | 'error' = 'error';
      let resultadoHerramienta: Awaited<ReturnType<typeof ejecutarHerramienta>>;

      try {
        argumentos = JSON.parse(llamada.arguments);
        resultadoHerramienta = await ejecutarHerramienta(
          llamada,
          argumentos,
          repositorio
        );
        estadoHerramienta = 'completada';
      } finally {
        const finalizadaEn = new Date();
        telemetria?.llamadasHerramientas.push({
          orden: cantidadLlamadas + 1,
          nombre: llamada.name,
          argumentos,
          iniciadaEn: iniciadaEn.toISOString(),
          finalizadaEn: finalizadaEn.toISOString(),
          duracionMs: Math.max(0, Date.now() - inicioHerramienta),
          estado: estadoHerramienta,
        });
      }

      const { salida, periodos } = resultadoHerramienta;
      periodosEjecutados.push(...periodos);
      entrada.push({
        type: 'function_call_output',
        call_id: llamada.call_id,
        output: JSON.stringify(salida),
      });
      cantidadLlamadas += 1;
    }
  }
}

export function crearClienteRespuestasOpenAI(): ClienteRespuestas {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Falta configurar OPENAI_API_KEY.');

  const cliente = new OpenAI({ apiKey });
  return {
    crear: (parametros, signal) =>
      cliente.responses.create(parametros, signal ? { signal } : undefined),
  };
}
