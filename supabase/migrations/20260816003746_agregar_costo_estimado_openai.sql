alter table public.interacciones_agente
  add column tokens_escritura_cache integer not null default 0
    check (tokens_escritura_cache >= 0),
  add column costo_estimado_usd numeric(14, 10)
    check (costo_estimado_usd is null or costo_estimado_usd >= 0),
  add column tarifa_version text
    check (tarifa_version is null or char_length(tarifa_version) between 1 and 100),
  add constraint interacciones_agente_tokens_cache_check check (
    tokens_cacheados + tokens_escritura_cache <= tokens_entrada
  ),
  add constraint interacciones_agente_costo_tarifa_check check (
    (costo_estimado_usd is null and tarifa_version is null)
    or (costo_estimado_usd is not null and tarifa_version is not null)
  );

comment on column public.interacciones_agente.costo_estimado_usd is
  'Estimación calculada en la aplicación según tokens reportados y la tarifa versionada; no reemplaza la facturación de OpenAI.';

comment on column public.interacciones_agente.tarifa_version is
  'Identificador de la tabla de precios usada para calcular costo_estimado_usd.';
