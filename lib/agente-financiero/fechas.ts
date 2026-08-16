import { z } from 'zod';

export const ZONA_HORARIA_FINANCIERA = 'America/Argentina/Buenos_Aires';
export const MAXIMO_DIAS_POR_PERIODO = 366;

const MILISEGUNDOS_POR_DIA = 86_400_000;
const PATRON_FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

function convertirFechaISOaUTC(valor: string): number | null {
  if (!PATRON_FECHA_ISO.test(valor)) return null;

  const [anio, mes, dia] = valor.split('-').map(Number);
  const instante = Date.UTC(anio, mes - 1, dia);
  const fecha = new Date(instante);

  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }

  return instante;
}

export function esFechaISOReal(valor: string): boolean {
  return convertirFechaISOaUTC(valor) !== null;
}

export function contarDiasInclusivos(desde: string, hasta: string): number {
  const inicio = convertirFechaISOaUTC(desde);
  const fin = convertirFechaISOaUTC(hasta);

  if (inicio === null || fin === null) {
    throw new Error('El período contiene una fecha inválida.');
  }

  return Math.floor((fin - inicio) / MILISEGUNDOS_POR_DIA) + 1;
}

export function obtenerFechaEnZonaHoraria(fecha = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_FINANCIERA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(fecha);

  const valores = Object.fromEntries(
    partes
      .filter((parte) => parte.type !== 'literal')
      .map((parte) => [parte.type, parte.value])
  );

  return `${valores.year}-${valores.month}-${valores.day}`;
}

export const esquemaFechaISO = z
  .string()
  .regex(PATRON_FECHA_ISO, 'La fecha debe usar el formato YYYY-MM-DD.')
  .refine(esFechaISOReal, 'La fecha no existe en el calendario.');

export const esquemaPeriodo = z
  .object({
    desde: esquemaFechaISO,
    hasta: esquemaFechaISO,
  })
  .strict()
  .superRefine((periodo, contexto) => {
    if (!esFechaISOReal(periodo.desde) || !esFechaISOReal(periodo.hasta)) return;

    const cantidadDias = contarDiasInclusivos(periodo.desde, periodo.hasta);

    if (cantidadDias < 1) {
      contexto.addIssue({
        code: 'custom',
        path: ['hasta'],
        message: 'La fecha hasta debe ser igual o posterior a la fecha desde.',
      });
    }

    if (cantidadDias > MAXIMO_DIAS_POR_PERIODO) {
      contexto.addIssue({
        code: 'custom',
        path: ['hasta'],
        message: `El período no puede superar ${MAXIMO_DIAS_POR_PERIODO} días inclusivos.`,
      });
    }
  });

export type Periodo = z.infer<typeof esquemaPeriodo>;
