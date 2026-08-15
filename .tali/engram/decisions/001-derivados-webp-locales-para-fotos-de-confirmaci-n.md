---
titulo: Derivados WebP locales para fotos de confirmación
tipo: adr
estado: active
fecha: 2026-08-15
autor: tali memory
---

# ADR-001 — Derivados WebP locales para fotos de confirmación

## Contexto

El bucket público contiene 201 imágenes que suman 775,33 MB. Supabase Image
Transformations responde `403 FeatureNotEnabled` en el plan actual, de modo que
la aplicación termina descargando los originales.

## Decisión

Conservar los originales y generar derivados WebP en
`random-moments-optimized` mediante un script local, idempotente y protegido
por una credencial server-side. La aplicación consumirá exclusivamente los
derivados y nunca volverá al original como fallback.

## Consecuencias

- No se requiere contratar Supabase Pro.
- La migración inicial requiere configurar localmente una clave con permiso de
  escritura.
- Los derivados tendrán un máximo de 750 KB y caché anual.
- Las fotos nuevas deberán pasar por el mismo pipeline.
- Un fallo de foto no bloqueará el guardado de la transacción.

## Referencia

[[SPEC-001-optimizar-carga-de-fotos-al-confirmar-transacciones]]
