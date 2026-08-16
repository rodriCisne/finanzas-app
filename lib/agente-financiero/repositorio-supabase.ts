import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BusquedaTransacciones,
  RepositorioFinanciero,
  ResultadoBusquedaTransacciones,
  TransaccionFinanciera,
} from './contratos';
import type { Periodo } from './fechas';

const TAMANO_PAGINA = 500;
const MAXIMO_CARACTERES_NOTA = 300;

type FilaTransaccion = {
  type: 'income' | 'expense';
  amount: number | string;
  currency_code: string;
  date: string;
  note: string | null;
  category: { name: string } | { name: string }[] | null;
  creator: { full_name: string | null } | { full_name: string | null }[] | null;
};

function escaparPatronLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (caracter) => `\\${caracter}`);
}

function obtenerNombreCategoria(fila: FilaTransaccion): string | null {
  const categoria = Array.isArray(fila.category) ? fila.category[0] : fila.category;
  return categoria?.name ?? null;
}

function obtenerNombreCreador(fila: FilaTransaccion): string | null {
  const creador = Array.isArray(fila.creator) ? fila.creator[0] : fila.creator;
  return creador?.full_name?.trim() || null;
}

function mapearTransaccion(fila: FilaTransaccion): TransaccionFinanciera {
  return {
    fecha: fila.date,
    tipo: fila.type,
    importe: fila.amount,
    moneda: fila.currency_code,
    categoria: obtenerNombreCategoria(fila),
    creador: obtenerNombreCreador(fila),
    nota: fila.note?.slice(0, MAXIMO_CARACTERES_NOTA) ?? null,
  };
}

function lanzarErrorConsulta(): never {
  throw new Error('No se pudieron consultar los movimientos financieros.');
}

export function crearRepositorioFinancieroSupabase(
  supabase: SupabaseClient,
  walletId: string,
  signal?: AbortSignal
): RepositorioFinanciero {
  async function listarTransacciones(
    periodo: Periodo
  ): Promise<readonly TransaccionFinanciera[]> {
    const acumuladas: TransaccionFinanciera[] = [];

    for (let pagina = 0; ; pagina += 1) {
      const inicio = pagina * TAMANO_PAGINA;
      const fin = inicio + TAMANO_PAGINA - 1;
      let consulta = supabase
        .from('transactions')
        .select(
          'type,amount,currency_code,date,note,category:categories(name),creator:profiles(full_name)'
        )
        .eq('wallet_id', walletId)
        .gte('date', periodo.desde)
        .lte('date', periodo.hasta)
        .order('date', { ascending: true })
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })
        .range(inicio, fin);

      if (signal) consulta = consulta.abortSignal(signal);

      const { data, error } = await consulta;
      if (error) lanzarErrorConsulta();

      const filas = (data ?? []) as unknown as FilaTransaccion[];
      acumuladas.push(...filas.map(mapearTransaccion));

      if (filas.length < TAMANO_PAGINA) break;
    }

    return acumuladas;
  }

  async function buscarTransacciones(
    filtros: BusquedaTransacciones
  ): Promise<ResultadoBusquedaTransacciones> {
    const cantidadSolicitada = filtros.limite + 1;
    const relacionCategoria = filtros.categoria
      ? 'category:categories!inner(name)'
      : 'category:categories(name)';
    let consulta = supabase
      .from('transactions')
      .select(
        `type,amount,currency_code,date,note,${relacionCategoria},creator:profiles(full_name)`
      )
      .eq('wallet_id', walletId)
      .gte('date', filtros.desde)
      .lte('date', filtros.hasta)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(cantidadSolicitada);

    if (filtros.tipo) consulta = consulta.eq('type', filtros.tipo);
    if (filtros.categoria) {
      consulta = consulta.ilike(
        'category.name',
        escaparPatronLike(filtros.categoria)
      );
    }
    if (filtros.texto) {
      consulta = consulta.ilike(
        'note',
        `%${escaparPatronLike(filtros.texto)}%`
      );
    }
    if (signal) consulta = consulta.abortSignal(signal);

    const { data, error } = await consulta;
    if (error) lanzarErrorConsulta();

    const filas = (data ?? []) as unknown as FilaTransaccion[];
    return {
      transacciones: filas.slice(0, filtros.limite).map(mapearTransaccion),
      hayMas: filas.length > filtros.limite,
    };
  }

  return { listarTransacciones, buscarTransacciones };
}
