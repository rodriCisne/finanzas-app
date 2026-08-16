import { z } from 'zod';
import { esquemaFechaISO, esquemaPeriodo, type Periodo } from './fechas';
import type { ImporteEntrada } from './dinero';

export const esquemaTipoTransaccion = z.enum(['income', 'expense']);
export type TipoTransaccion = z.infer<typeof esquemaTipoTransaccion>;

export interface TransaccionFinanciera {
  fecha: string;
  tipo: TipoTransaccion;
  importe: ImporteEntrada;
  moneda: string;
  categoria: string | null;
  creador: string | null;
  nota: string | null;
}

export const esquemaGastosPorPersona = esquemaPeriodo
  .safeExtend({
    agrupacion: z.enum(['total', 'mes']),
  })
  .strict();

export const esquemaBusquedaTransacciones = esquemaPeriodo
  .safeExtend({
    tipo: esquemaTipoTransaccion.nullable().optional(),
    categoria: z.string().trim().min(1).max(100).nullable().optional(),
    texto: z.string().trim().min(1).max(100).nullable().optional(),
    limite: z.number().int().min(1).max(50).default(20),
  })
  .strict();

export type BusquedaTransacciones = z.infer<
  typeof esquemaBusquedaTransacciones
>;

export interface ResultadoBusquedaTransacciones {
  transacciones: readonly TransaccionFinanciera[];
  hayMas: boolean;
}

export interface RepositorioFinanciero {
  listarTransacciones(periodo: Periodo): Promise<readonly TransaccionFinanciera[]>;
  buscarTransacciones(
    filtros: BusquedaTransacciones
  ): Promise<ResultadoBusquedaTransacciones>;
}

export const esquemaComparacionPeriodos = z
  .object({
    desde_a: esquemaFechaISO,
    hasta_a: esquemaFechaISO,
    desde_b: esquemaFechaISO,
    hasta_b: esquemaFechaISO,
  })
  .strict()
  .superRefine((valor, contexto) => {
    const resultados = [
      esquemaPeriodo.safeParse({ desde: valor.desde_a, hasta: valor.hasta_a }),
      esquemaPeriodo.safeParse({ desde: valor.desde_b, hasta: valor.hasta_b }),
    ];

    resultados.forEach((resultado, indice) => {
      if (resultado.success) return;

      for (const problema of resultado.error.issues) {
        contexto.addIssue({
          code: 'custom',
          path: [indice === 0 ? 'hasta_a' : 'hasta_b'],
          message: problema.message,
        });
      }
    });
  });

export type ComparacionPeriodos = z.infer<typeof esquemaComparacionPeriodos>;
