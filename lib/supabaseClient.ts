import { createClient } from '@supabase/supabase-js';

// Si más adelante generás tipos de DB con supabase, podés reemplazar "any" por "Database"
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client para usar en componentes cliente o en funciones simples
export const supabaseBrowserClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey);
};