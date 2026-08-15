---
id: SPEC-001
titulo: "Optimizar carga de fotos al confirmar transacciones"
tipo: spec
estado: implementada
version: 1.0.0
fecha: 2026-08-15
autor: Planner
blueprint: three-tier
stack: nextjs-fullstack
componentes:
  - frontend
---

# SPEC-001 — Optimizar carga de fotos al confirmar transacciones

## Contexto

Al crear una transacción, `TransactionFormScreen` abre
`ExpenseConfirmationModal`. Aunque el nombre del componente menciona gastos,
el modal se utiliza tanto para ingresos como para gastos. El modal lista hasta
100 objetos de `fotosRodricu/random-moments`, elige uno al azar e intenta
servirlo mediante Supabase Image Transformations.

La medición inicial de objetos del bucket realizada el 2026-08-15 arrojó:

- 203 objetos totales; 201 son imágenes y 2 son videos que el código anterior
  trataba erróneamente como imágenes.
- Las 201 imágenes suman 775,33 MB.
- 3,86 MB de promedio y 2,37 MB de mediana.
- 119 imágenes mayores a 1 MB.
- Una imagen máxima de 42,96 MB.

La URL original responde HTTP 200, pero
`/storage/v1/render/image/public/...` responde HTTP 403 con código
`FeatureNotEnabled`. Por eso el `onError` actual activa el fallback y descarga
siempre el original pesado. Supabase Image Transformations requiere un plan Pro
o superior y no puede ser una dependencia obligatoria de esta aplicación.

## Objetivo

Reducir de forma sustancial el peso y el tiempo de carga de la foto mostrada al
confirmar una transacción, sin cambiar el plan de Supabase, sin alterar los
originales y sin exponer credenciales privilegiadas al navegador.

## Alcance

### Incluido

1. Crear un proceso local, repetible y no destructivo que:
   - enumere los objetos de `fotosRodricu/random-moments` con paginación y
     excluya explícitamente videos y otros formatos no visuales;
   - descargue cada original público;
   - corrija la orientación, elimine metadatos y genere WebP;
   - limite el lado mayor a 1600 px, sin ampliar imágenes pequeñas;
   - use calidad inicial 72 y reduzca calidad/dimensión cuando sea necesario
     para cumplir un máximo de 750 KB por derivado;
   - guarde los derivados en `random-moments-optimized` usando nombres estables
     que no colisionen;
   - configure `content-type: image/webp` y caché de 31.536.000 segundos;
   - soporte `--dry-run`, reanudación, omisión de archivos ya procesados y un
     resumen final de cantidad/peso/errores.
2. Ejecutar el proceso con una variable local
   `SUPABASE_SERVICE_ROLE_KEY`, nunca con prefijo `NEXT_PUBLIC_`, sin registrar
   su valor en logs ni versionarlo.
3. Cambiar el modal para listar y consumir exclusivamente
   `random-moments-optimized` mediante URL pública directa.
4. Eliminar la construcción manual de URLs `/render/image/` y el fallback a
   los originales pesados. Ante error se conservarán la frase y el botón de
   continuación, con un fondo visual liviano sin foto.
5. Precargar una foto optimizada en paralelo con la creación de la transacción
   y reutilizarla al abrir el modal.
6. Aplicar el comportamiento a ingresos y gastos.
7. Mantener los originales sin modificaciones ni eliminaciones.

### Fuera de alcance

- Cambiar el proyecto a un plan pago de Supabase.
- Eliminar, reemplazar o recomprimir los originales.
- Permitir que usuarios adjunten comprobantes a una transacción.
- Modificar tablas, RLS o políticas de Storage para habilitar escrituras
  públicas.
- Migrar las imágenes de `valentine-assets`.

## Diseño técnico

### Proceso de optimización

Se agregará un script versionado bajo `scripts/` y `sharp` como dependencia de
desarrollo con versión fijada en el lockfile. La lectura de originales puede
usar URLs públicas, pero toda escritura a Storage se realizará desde el script
local con la clave de servicio obtenida del entorno. El script no deberá
imprimir claves, tokens ni encabezados de autorización.

La carpeta de destino será paralela a la original:

```text
fotosRodricu/
├── random-moments/             # originales, solo lectura
└── random-moments-optimized/   # derivados WebP para la aplicación
```

Una ejecución repetida deberá ser idempotente: no reescribirá un derivado
válido salvo que se solicite explícitamente. Antes de cualquier carga real se
ejecutará el modo `--dry-run` y se informará el volumen estimado.

### Aplicación

La selección de la foto se extraerá del modal a una utilidad reutilizable que:

1. lista la carpeta optimizada;
2. filtra únicamente objetos de imagen válidos;
3. selecciona uno al azar;
4. obtiene su URL pública directa;
5. inicia la precarga en el navegador.

`TransactionFormScreen` iniciará esa preparación después de validar el
formulario y en paralelo con los inserts de la transacción. El modal recibirá
el resultado ya preparado. Si la preparación falla, la transacción seguirá
siendo válida y el modal mostrará el estado degradado sin descargar el
original.

### Seguridad

- La clave `service_role` será exclusivamente local y server-side.
- No se agregará ninguna clave real al repositorio ni a archivos generados.
- No se relajarán políticas de Storage.
- El cliente seguirá usando únicamente la clave pública para listar y leer el
  bucket público existente.
- La optimización no deberá bloquear ni revertir el guardado de la transacción.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Interrupción durante el procesamiento de 203 imágenes | Script reanudable e idempotente, con omisión de derivados existentes. |
| Colisión entre nombres con extensiones diferentes | Derivar el nombre desde el nombre completo original o un hash estable. |
| Derivados todavía demasiado pesados | Límite duro de 750 KB con reducción iterativa de calidad/dimensión. |
| Exposición accidental de `service_role` | Variable sin prefijo público, validación de entorno y logs sanitizados. |
| Error o carpeta optimizada vacía | Modal degradado sin foto; nunca volver al original pesado. |
| Caché obsoleta al reemplazar una foto | Nombres inmutables o versionados; no usar `upsert` por defecto. |

## Plan de implementación

1. Incorporar la dependencia y el script de optimización con modo `--dry-run`.
2. Ejecutar el modo seco y verificar inventario, nombres y volumen estimado.
3. Con autorización explícita, generar y cargar derivados en la carpeta nueva.
4. Verificar formato, peso, caché y disponibilidad pública de una muestra y
   del inventario completo.
5. Extraer la selección/precarga de foto a una utilidad cliente reutilizable.
6. Integrarla con `TransactionFormScreen` y simplificar
   `ExpenseConfirmationModal`.
7. Ejecutar lint, build y pruebas funcionales de ingreso, gasto y degradación.
8. Comparar bytes transferidos antes/después y documentar el resultado.

## Criterios de aceptación

| # | Criterio | Verifica |
|---|----------|----------|
| CA-1 | Los 203 objetos originales permanecen intactos en `random-moments`. | Comparación de inventario antes/después. |
| CA-2 | Cada imagen utilizada por el modal proviene de `random-moments-optimized`, es WebP y pesa como máximo 750 KB. | Auditoría automatizada de metadata y encabezados. |
| CA-3 | La suma de los derivados es al menos 80 % menor que los 775,33 MB de imágenes originales. | Resumen del script y auditoría del bucket. |
| CA-4 | El navegador no solicita URLs `/render/image/` ni archivos de `random-moments/` durante la confirmación. | Inspección de red o prueba automatizada. |
| CA-5 | La foto comienza a precargarse mientras se guarda la transacción y se reutiliza al abrir el modal. | Prueba de integración del flujo. |
| CA-6 | Si falla la lista o la carga de foto, la transacción se guarda y el usuario puede continuar sin imagen pesada. | Prueba de error controlado. |
| CA-7 | El comportamiento funciona para nuevas transacciones de tipo ingreso y gasto. | Prueba funcional de ambos casos. |
| CA-8 | Ninguna clave `service_role` aparece en bundles, logs, Git o variables `NEXT_PUBLIC_*`. | Búsqueda estática y revisión del build. |
| CA-9 | `npm run lint`, `npm run build` y `tali validate --strict` finalizan correctamente. | Comandos de CI/local. |

## Delegación

→ **DELEGAR A:** Frontend para el script, la integración cliente y el modal;
Security para revisar el manejo de credenciales; QA para verificar los nueve
criterios de aceptación.

→ **CRITERIO DE ACEPTACIÓN:** QA debe demostrar CA-1 a CA-9 con resultados
reproducibles antes de cerrar `verify`.
