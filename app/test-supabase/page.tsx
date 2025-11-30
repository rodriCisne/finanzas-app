// app/test-supabase/page.tsx
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function TestSupabasePage() {
  const { data, error } = await supabase
    .from('currencies')
    .select('*')
    .order('code', { ascending: true });

  if (error) {
    console.error(error);
    return (
      <main className="min-h-screen flex items-center justify-center bg-red-950 text-red-100">
        <div>
          <h1 className="text-xl font-bold mb-2">Error conectando a Supabase</h1>
          <p>{error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 p-6">
      <h1 className="text-2xl font-bold mb-4">Test Supabase – Currencies</h1>
      <ul className="space-y-2">
        {data?.map((c) => (
          <li
            key={c.code}
            className="flex items-center justify-between rounded-md border border-slate-800 px-4 py-2"
          >
            <div>
              <div className="font-semibold">
                {c.code} – {c.name}
              </div>
              <div className="text-sm text-slate-400">
                Símbolo: {c.symbol} · Decimales: {c.decimals}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
