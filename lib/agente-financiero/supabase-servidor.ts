import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function obtenerConfiguracionPublicaSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clavePublica =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !clavePublica) {
    throw new Error('Falta la configuración pública de Supabase.');
  }

  return { url, clavePublica };
}

export function crearClienteSupabaseUsuario(jwt: string): SupabaseClient {
  const { url, clavePublica } = obtenerConfiguracionPublicaSupabase();

  return createClient(url, clavePublica, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });
}
