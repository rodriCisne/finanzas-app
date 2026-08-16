const PATRON_IMPORTE_DECIMAL = /^\d+(?:[.,]\d{1,2})?$/;
const PATRON_MONEDA_ISO = /^[A-Z]{3}$/;

export type ImporteEntrada = number | string;

export interface ImporteConMoneda {
  importe: ImporteEntrada;
  moneda: string;
}

export interface TotalPorMoneda {
  moneda: string;
  total: string;
}

function importeComoTexto(importe: ImporteEntrada): string {
  if (typeof importe === 'string') return importe.trim();

  if (!Number.isFinite(importe) || importe < 0) {
    throw new Error('El importe debe ser un número finito y no negativo.');
  }

  return importe.toFixed(2);
}

export function convertirACentavos(importe: ImporteEntrada): number {
  const texto = importeComoTexto(importe).replace(',', '.');

  if (!PATRON_IMPORTE_DECIMAL.test(texto)) {
    throw new Error('El importe debe tener como máximo dos decimales.');
  }

  const [parteEntera, parteDecimal = ''] = texto.split('.');
  const centavos = parteDecimal.padEnd(2, '0');

  const resultado = Number(parteEntera) * 100 + Number(centavos);

  if (!Number.isSafeInteger(resultado)) {
    throw new Error('El importe supera el rango monetario seguro.');
  }

  return resultado;
}

export function sumarCentavos(...valores: number[]): number {
  const resultado = valores.reduce((total, valor) => total + valor, 0);

  if (!Number.isSafeInteger(resultado)) {
    throw new Error('La suma supera el rango monetario seguro.');
  }

  return resultado;
}

export function centavosATexto(centavos: number): string {
  if (!Number.isSafeInteger(centavos)) {
    throw new Error('Los centavos deben ser un entero seguro.');
  }

  const signo = centavos < 0 ? '-' : '';
  const valorAbsoluto = Math.abs(centavos);
  const parteEntera = Math.floor(valorAbsoluto / 100);
  const parteDecimal = String(valorAbsoluto % 100).padStart(2, '0');

  return `${signo}${parteEntera}.${parteDecimal}`;
}

export function normalizarMoneda(moneda: string): string {
  const monedaNormalizada = moneda.trim().toUpperCase();

  if (!PATRON_MONEDA_ISO.test(monedaNormalizada)) {
    throw new Error('La moneda debe ser un código ISO de tres letras.');
  }

  return monedaNormalizada;
}

export function agruparImportesPorMoneda(
  importes: readonly ImporteConMoneda[]
): TotalPorMoneda[] {
  const acumulados = new Map<string, number>();

  for (const item of importes) {
    const moneda = normalizarMoneda(item.moneda);
    const totalActual = acumulados.get(moneda) ?? 0;
    acumulados.set(
      moneda,
      sumarCentavos(totalActual, convertirACentavos(item.importe))
    );
  }

  return [...acumulados.entries()]
    .sort(([monedaA], [monedaB]) => monedaA.localeCompare(monedaB))
    .map(([moneda, centavos]) => ({
      moneda,
      total: centavosATexto(centavos),
    }));
}
