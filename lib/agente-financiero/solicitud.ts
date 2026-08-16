import { z } from 'zod';

export const esquemaSolicitudAgente = z
  .object({
    pregunta: z.string().trim().min(1).max(1_000),
    walletId: z.string().uuid(),
    historial: z
      .array(
        z
          .object({
            rol: z.enum(['user', 'assistant']),
            contenido: z.string().trim().min(1).max(4_000),
          })
          .strict()
      )
      .max(8)
      .default([]),
  })
  .strict();

export function extraerTokenBearer(
  encabezadoAutorizacion: string | null
): string | null {
  if (!encabezadoAutorizacion) return null;

  const coincidencia = encabezadoAutorizacion.match(/^Bearer ([^\s]+)$/i);
  return coincidencia?.[1] ?? null;
}
