import { describe, expect, it, vi } from 'vitest';
import {
  buscarTransacciones,
  compararPeriodos,
  obtenerDistribucionPorCategoria,
  obtenerGastosPorPersona,
  obtenerResumen,
  type RepositorioFinanciero,
} from '@/lib/agente-financiero/herramientas';
import type { TransaccionFinanciera } from '@/lib/agente-financiero/contratos';

const transacciones: TransaccionFinanciera[] = [
  {
    fecha: '2026-08-01',
    tipo: 'income',
    importe: '1000.00',
    moneda: 'ARS',
    categoria: 'Sueldo',
    creador: 'Rodri',
    nota: null,
  },
  {
    fecha: '2026-08-02',
    tipo: 'expense',
    importe: '100.10',
    moneda: 'ARS',
    categoria: 'Comida',
    creador: 'Rodri',
    nota: 'Almuerzo',
  },
  {
    fecha: '2026-08-03',
    tipo: 'expense',
    importe: '0.20',
    moneda: 'ARS',
    categoria: 'Comida',
    creador: 'Vicu',
    nota: null,
  },
  {
    fecha: '2026-08-04',
    tipo: 'expense',
    importe: '12.50',
    moneda: 'USD',
    categoria: null,
    creador: 'Vicu',
    nota: 'Suscripción',
  },
];

function crearRepositorio(
  datos: readonly TransaccionFinanciera[] = transacciones
): RepositorioFinanciero {
  return {
    listarTransacciones: vi.fn(async () => datos),
    buscarTransacciones: vi.fn(async (filtros) => ({
      transacciones: datos.slice(0, filtros.limite),
      hayMas: datos.length > filtros.limite,
    })),
  };
}

describe('herramientas financieras', () => {
  it('resume ingresos, gastos y balance por moneda', async () => {
    const resultado = await obtenerResumen(crearRepositorio(), {
      desde: '2026-08-01',
      hasta: '2026-08-31',
    });

    expect(resultado.totales).toEqual([
      {
        moneda: 'ARS',
        ingresos: '1000.00',
        gastos: '100.30',
        balance: '899.70',
      },
      {
        moneda: 'USD',
        ingresos: '0.00',
        gastos: '12.50',
        balance: '-12.50',
      },
    ]);
  });

  it('distribuye solo el tipo solicitado y conserva monedas separadas', async () => {
    const resultado = await obtenerDistribucionPorCategoria(crearRepositorio(), {
      desde: '2026-08-01',
      hasta: '2026-08-31',
      tipo: 'expense',
    });

    expect(resultado.categorias).toEqual([
      {
        categoria: 'Comida',
        totales: [{ moneda: 'ARS', total: '100.30' }],
      },
      {
        categoria: 'Sin categoría',
        totales: [{ moneda: 'USD', total: '12.50' }],
      },
    ]);
  });

  it('agrupa gastos por creador y mes sin inferir nombres desde notas', async () => {
    const resultado = await obtenerGastosPorPersona(crearRepositorio(), {
      desde: '2026-08-01',
      hasta: '2026-08-31',
      agrupacion: 'mes',
    });

    expect(resultado.gastos).toEqual([
      {
        periodo: '2026-08',
        persona: 'Rodri',
        moneda: 'ARS',
        total: '100.10',
      },
      {
        periodo: '2026-08',
        persona: 'Vicu',
        moneda: 'ARS',
        total: '0.20',
      },
      {
        periodo: '2026-08',
        persona: 'Vicu',
        moneda: 'USD',
        total: '12.50',
      },
    ]);
  });

  it('limita búsquedas de detalle a un máximo de 50 filas', async () => {
    await expect(
      buscarTransacciones(crearRepositorio(), {
        desde: '2026-08-01',
        hasta: '2026-08-31',
        limite: 51,
      })
    ).rejects.toThrow();
  });

  it('consulta ambos períodos al comparar', async () => {
    const repositorio = crearRepositorio([]);
    const resultado = await compararPeriodos(repositorio, {
      desde_a: '2026-07-01',
      hasta_a: '2026-07-31',
      desde_b: '2026-08-01',
      hasta_b: '2026-08-31',
    });

    expect(repositorio.listarTransacciones).toHaveBeenCalledTimes(2);
    expect(resultado.periodoA.periodo.desde).toBe('2026-07-01');
    expect(resultado.periodoB.periodo.desde).toBe('2026-08-01');
  });

  it('rechaza propiedades no declaradas en las entradas', async () => {
    await expect(
      obtenerResumen(crearRepositorio(), {
        desde: '2026-08-01',
        hasta: '2026-08-31',
        walletId: 'inyectado-por-el-modelo',
      })
    ).rejects.toThrow();
  });
});
