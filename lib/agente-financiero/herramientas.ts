import {
  centavosATexto,
  convertirACentavos,
  normalizarMoneda,
  sumarCentavos,
} from './dinero';
import { esquemaPeriodo, type Periodo } from './fechas';
import {
  esquemaBusquedaTransacciones,
  esquemaComparacionPeriodos,
  esquemaGastosPorPersona,
  esquemaTipoTransaccion,
  type BusquedaTransacciones,
  type ComparacionPeriodos,
  type RepositorioFinanciero,
  type TransaccionFinanciera,
} from './contratos';

interface Acumulado {
  ingresos: number;
  gastos: number;
}

export interface ResumenMoneda {
  moneda: string;
  ingresos: string;
  gastos: string;
  balance: string;
}

export interface ResumenPeriodo {
  periodo: Periodo;
  totales: ResumenMoneda[];
}

function resumirPorMoneda(
  transacciones: readonly TransaccionFinanciera[]
): ResumenMoneda[] {
  const acumulados = new Map<string, Acumulado>();

  for (const transaccion of transacciones) {
    const moneda = normalizarMoneda(transaccion.moneda);
    const importe = convertirACentavos(transaccion.importe);
    const acumulado = acumulados.get(moneda) ?? { ingresos: 0, gastos: 0 };

    if (transaccion.tipo === 'income') {
      acumulado.ingresos = sumarCentavos(acumulado.ingresos, importe);
    } else {
      acumulado.gastos = sumarCentavos(acumulado.gastos, importe);
    }

    acumulados.set(moneda, acumulado);
  }

  return [...acumulados.entries()]
    .sort(([monedaA], [monedaB]) => monedaA.localeCompare(monedaB))
    .map(([moneda, acumulado]) => ({
      moneda,
      ingresos: centavosATexto(acumulado.ingresos),
      gastos: centavosATexto(acumulado.gastos),
      balance: centavosATexto(
        sumarCentavos(acumulado.ingresos, -acumulado.gastos)
      ),
    }));
}

export async function obtenerResumen(
  repositorio: RepositorioFinanciero,
  entrada: unknown
): Promise<ResumenPeriodo> {
  const periodo = esquemaPeriodo.parse(entrada);
  const transacciones = await repositorio.listarTransacciones(periodo);

  return { periodo, totales: resumirPorMoneda(transacciones) };
}

export async function obtenerDistribucionPorCategoria(
  repositorio: RepositorioFinanciero,
  entrada: unknown
) {
  const parametros = esquemaPeriodo
    .safeExtend({ tipo: esquemaTipoTransaccion })
    .strict()
    .parse(entrada);
  const transacciones = await repositorio.listarTransacciones(parametros);
  const categorias = new Map<string, Map<string, number>>();

  for (const transaccion of transacciones) {
    if (transaccion.tipo !== parametros.tipo) continue;

    const categoria = transaccion.categoria?.trim() || 'Sin categoría';
    const moneda = normalizarMoneda(transaccion.moneda);
    const monedas = categorias.get(categoria) ?? new Map<string, number>();
    monedas.set(
      moneda,
      sumarCentavos(
        monedas.get(moneda) ?? 0,
        convertirACentavos(transaccion.importe)
      )
    );
    categorias.set(categoria, monedas);
  }

  return {
    periodo: { desde: parametros.desde, hasta: parametros.hasta },
    tipo: parametros.tipo,
    categorias: [...categorias.entries()]
      .sort(([categoriaA], [categoriaB]) => categoriaA.localeCompare(categoriaB))
      .map(([categoria, monedas]) => ({
        categoria,
        totales: [...monedas.entries()]
          .sort(([monedaA], [monedaB]) => monedaA.localeCompare(monedaB))
          .map(([moneda, total]) => ({ moneda, total: centavosATexto(total) })),
      })),
  };
}

export async function obtenerGastosPorPersona(
  repositorio: RepositorioFinanciero,
  entrada: unknown
) {
  const parametros = esquemaGastosPorPersona.parse(entrada);
  const transacciones = await repositorio.listarTransacciones(parametros);
  const acumulados = new Map<string, number>();

  for (const transaccion of transacciones) {
    if (transaccion.tipo !== 'expense') continue;

    const periodo =
      parametros.agrupacion === 'mes' ? transaccion.fecha.slice(0, 7) : 'total';
    const persona = transaccion.creador || 'Sin responsable';
    const moneda = normalizarMoneda(transaccion.moneda);
    const clave = JSON.stringify([periodo, persona, moneda]);
    acumulados.set(
      clave,
      sumarCentavos(
        acumulados.get(clave) ?? 0,
        convertirACentavos(transaccion.importe)
      )
    );
  }

  return {
    periodo: { desde: parametros.desde, hasta: parametros.hasta },
    agrupacion: parametros.agrupacion,
    gastos: [...acumulados.entries()]
      .map(([clave, total]) => {
        const [periodo, persona, moneda] = JSON.parse(clave) as [
          string,
          string,
          string,
        ];
        return { periodo, persona, moneda, total: centavosATexto(total) };
      })
      .sort(
        (a, b) =>
          a.periodo.localeCompare(b.periodo) ||
          a.persona.localeCompare(b.persona, 'es') ||
          a.moneda.localeCompare(b.moneda)
      ),
  };
}

export async function buscarTransacciones(
  repositorio: RepositorioFinanciero,
  entrada: unknown
) {
  const filtros = esquemaBusquedaTransacciones.parse(entrada);
  const resultado = await repositorio.buscarTransacciones(filtros);

  return {
    periodo: { desde: filtros.desde, hasta: filtros.hasta },
    ...resultado,
  };
}

export async function compararPeriodos(
  repositorio: RepositorioFinanciero,
  entrada: unknown
) {
  const parametros = esquemaComparacionPeriodos.parse(entrada);
  const periodoA = { desde: parametros.desde_a, hasta: parametros.hasta_a };
  const periodoB = { desde: parametros.desde_b, hasta: parametros.hasta_b };
  const [transaccionesA, transaccionesB] = await Promise.all([
    repositorio.listarTransacciones(periodoA),
    repositorio.listarTransacciones(periodoB),
  ]);

  return {
    periodoA: { periodo: periodoA, totales: resumirPorMoneda(transaccionesA) },
    periodoB: { periodo: periodoB, totales: resumirPorMoneda(transaccionesB) },
  };
}

export type {
  BusquedaTransacciones,
  ComparacionPeriodos,
  RepositorioFinanciero,
};
