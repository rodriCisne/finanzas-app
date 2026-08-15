---
titulo: Image Transformations deshabilitado provoca fallback pesado
tipo: bug
estado: resuelto
fecha: 2026-08-15
autor: tali memory
---

# Bug — Image Transformations deshabilitado provoca fallback pesado

## Síntoma

Después de guardar una transacción, la foto de confirmación tarda demasiado o
consume varios megabytes. Algunas selecciones también pueden fallar porque el
listado incluía videos como si fueran imágenes.

## Causa raíz

La URL `/storage/v1/render/image/public/` responde HTTP 403 con
`FeatureNotEnabled`. El `onError` del modal ocultaba el problema al cambiar a
la URL original. Además, el filtro solo excluía archivos ocultos y no validaba
el tipo MIME.

## Evidencia

- Original probado: HTTP 200, 653.187 bytes.
- Transformación equivalente: HTTP 403.
- 201 imágenes: 775,33 MB; máximo de 42,96 MB.
- Dos videos detectados y excluidos del pipeline.

## Prevención

- No depender de una característica paga sin verificar su disponibilidad.
- No usar originales pesados como fallback silencioso.
- Filtrar objetos por MIME/extensión antes de procesarlos.
- Auditar peso, formato y carpeta de origen en el paso `verify`.

## Resolución

Se ejecutó la migración definida en
[[SPEC-001-optimizar-carga-de-fotos-al-confirmar-transacciones]]. La auditoría
confirmó 201 derivados WebP, cero faltantes, cero huérfanos y cero objetos
inválidos. El total bajó de 775,33 MB a 27,18 MB (96,5 %) y el mayor derivado
pesa 498 KB. Los 203 objetos originales permanecen intactos.
