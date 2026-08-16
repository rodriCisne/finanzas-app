create table public.interacciones_agente (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  billetera_id uuid not null references public.wallets(id) on delete cascade,
  pregunta text not null check (char_length(pregunta) between 1 and 1000),
  respuesta text check (respuesta is null or char_length(respuesta) between 1 and 4000),
  modelo text not null check (char_length(modelo) between 1 and 100),
  estado text not null check (estado in ('completada', 'error')),
  codigo_error text check (codigo_error is null or char_length(codigo_error) between 1 and 100),
  iniciada_en timestamptz not null,
  finalizada_en timestamptz not null,
  duracion_ms bigint not null check (duracion_ms >= 0),
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_salida integer not null default 0 check (tokens_salida >= 0),
  tokens_cacheados integer not null default 0 check (
    tokens_cacheados >= 0 and tokens_cacheados <= tokens_entrada
  ),
  tokens_totales integer not null default 0 check (
    tokens_totales = tokens_entrada + tokens_salida
  ),
  cantidad_llamadas_modelo smallint not null default 0 check (
    cantidad_llamadas_modelo between 0 and 7
  ),
  llamadas_herramientas jsonb not null default '[]'::jsonb check (
    jsonb_typeof(llamadas_herramientas) = 'array'
    and jsonb_array_length(llamadas_herramientas) <= 6
  ),
  cantidad_llamadas_herramientas smallint generated always as (
    jsonb_array_length(llamadas_herramientas)
  ) stored,
  creada_en timestamptz not null default now(),
  constraint interacciones_agente_estado_respuesta_check check (
    (estado = 'completada' and respuesta is not null and codigo_error is null)
    or (estado = 'error' and respuesta is null and codigo_error is not null)
  ),
  constraint interacciones_agente_fechas_check check (
    finalizada_en >= iniciada_en
  )
);

create index interacciones_agente_usuario_fecha_idx
  on public.interacciones_agente (usuario_id, iniciada_en desc);

create index interacciones_agente_billetera_fecha_idx
  on public.interacciones_agente (billetera_id, iniciada_en desc);

alter table public.interacciones_agente enable row level security;

revoke all on table public.interacciones_agente from anon;
revoke all on table public.interacciones_agente from authenticated;
grant select, insert on table public.interacciones_agente to authenticated;

create policy "leer interacciones propias del agente"
  on public.interacciones_agente
  for select
  to authenticated
  using (usuario_id = (select auth.uid()));

create policy "registrar interacciones propias del agente"
  on public.interacciones_agente
  for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())
    and exists (
      select 1
      from public.wallet_members as miembro
      where miembro.wallet_id = billetera_id
        and miembro.user_id = (select auth.uid())
    )
  );

comment on table public.interacciones_agente is
  'Telemetría sensible de consultas al agente financiero. No es un registro de auditoría inmutable frente al propio usuario.';

comment on column public.interacciones_agente.llamadas_herramientas is
  'Lista ordenada de herramientas, argumentos validados, duración y estado. No contiene resultados financieros crudos.';
