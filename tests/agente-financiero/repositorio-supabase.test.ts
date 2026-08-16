import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { crearRepositorioFinancieroSupabase } from '@/lib/agente-financiero/repositorio-supabase';

function crearFila(indice: number) {
  return {
    type: 'expense',
    amount: '1.00',
    currency_code: 'ARS',
    date: '2026-08-15',
    note: `Movimiento ${indice}`,
    category: { name: 'Pruebas' },
    creator: { full_name: 'Rodri' },
  };
}

function crearClientePaginado(paginas: unknown[][]) {
  const rangos: [number, number][] = [];
  let paginaActual = 0;

  function crearConsulta() {
    const consulta = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      gte() {
        return this;
      },
      lte() {
        return this;
      },
      order() {
        return this;
      },
      range(inicio: number, fin: number) {
        rangos.push([inicio, fin]);
        return this;
      },
      then<TResult1 = { data: unknown[]; error: null }, TResult2 = never>(
        resolver?:
          | ((valor: { data: unknown[]; error: null }) => TResult1 | PromiseLike<TResult1>)
          | null,
        rechazar?: ((razon: unknown) => TResult2 | PromiseLike<TResult2>) | null
      ) {
        const respuesta = {
          data: paginas[paginaActual++] ?? [],
          error: null,
        };
        return Promise.resolve(respuesta).then(resolver, rechazar);
      },
    };
    return consulta;
  }

  const cliente = {
    from: vi.fn(() => crearConsulta()),
  } as unknown as SupabaseClient;

  return { cliente, rangos };
}

describe('repositorio financiero Supabase', () => {
  it('pagina agregados hasta recuperar todas las filas', async () => {
    const primeraPagina = Array.from({ length: 500 }, (_, indice) =>
      crearFila(indice)
    );
    const segundaPagina = [crearFila(500)];
    const { cliente, rangos } = crearClientePaginado([
      primeraPagina,
      segundaPagina,
    ]);
    const repositorio = crearRepositorioFinancieroSupabase(
      cliente,
      '9bd17799-f566-4b52-a08f-3ebd9a1040c8'
    );

    const resultado = await repositorio.listarTransacciones({
      desde: '2026-08-01',
      hasta: '2026-08-31',
    });

    expect(resultado).toHaveLength(501);
    expect(rangos).toEqual([
      [0, 499],
      [500, 999],
    ]);
  });
});
