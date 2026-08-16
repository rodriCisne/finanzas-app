---
id: SPEC-002
titulo: "Agente financiero de consultas con OpenAI"
tipo: spec
estado: implementada
version: 1.1.1
fecha: 2026-08-15
autor: Planner
blueprint: three-tier
stack: nextjs-fullstack
componentes:
  - api
  - frontend
---

# SPEC-002 — Agente financiero de consultas con OpenAI

## Contexto

La aplicación permite registrar ingresos y gastos, organizarlos por billetera,
categoría, etiqueta y autor, y consultar analíticas predefinidas. Actualmente
el usuario debe navegar filtros y gráficos para responder preguntas concretas;
no existe una interfaz conversacional que decida qué consulta ejecutar.

Se incorporará un agente educativo y acotado, basado en OpenAI Responses API y
el modelo `gpt-5.6-luna`. El agente podrá elegir entre herramientas internas de
consulta, pero no recibirá acceso directo a SQL, credenciales privilegiadas ni
herramientas de escritura.

La ejecución será manual. El usuario abrirá la pantalla Asistente y escribirá
una pregunta. No habrá cron, tareas en segundo plano ni análisis espontáneos.

## Objetivo

Permitir que un miembro autenticado consulte en lenguaje natural la información
financiera de su billetera activa, incluyendo fechas específicas, rangos
inclusivos, períodos relativos y comparaciones, manteniendo RLS, minimización de
datos y comportamiento estrictamente de solo lectura.

## Alcance

### Incluido

1. Agregar una pantalla `/assistant` accesible desde el menú inferior, con:
   - conversación en memoria mientras la página permanezca abierta;
   - campo de pregunta y estados de carga/error;
   - preguntas sugeridas para descubrir el funcionamiento;
   - identificación visible de la billetera activa;
   - respuestas legibles en español latinoamericano.
2. Agregar un Route Handler `POST /api/financial-agent` que:
   - acepte pregunta, historial acotado y `walletId`;
   - exija un Bearer token de Supabase;
   - valide el token mediante `auth.getUser(token)`;
   - consulte Supabase con el contexto JWT del usuario para preservar RLS;
   - rechace billeteras inaccesibles y entradas inválidas;
   - mantenga `OPENAI_API_KEY` exclusivamente en servidor.
3. Integrar el SDK oficial de OpenAI y Responses API con:
   - modelo configurable mediante `OPENAI_MODEL`, con valor esperado
     `gpt-5.6-luna`;
   - `reasoning.effort: low` como punto inicial de latencia/costo;
   - `store: false`;
   - Function Calling en modo estricto;
   - máximo de seis llamadas de herramienta por solicitud;
   - sin herramientas integradas de web, archivos, código o escritura.
4. Implementar exclusivamente estas herramientas de lectura:
   - `obtener_resumen(desde, hasta)`;
   - `obtener_distribucion_por_categoria(desde, hasta, tipo)`;
   - `buscar_transacciones(desde, hasta, tipo, categoria, texto, limite)`;
   - `obtener_gastos_por_persona(desde, hasta, agrupacion)`;
   - `comparar_periodos(desde_a, hasta_a, desde_b, hasta_b)`.
5. Admitir:
   - fecha específica;
   - rango de fechas inclusivo;
   - expresiones relativas como hoy, ayer, esta semana o mes anterior;
   - comparación de dos períodos;
   - filtros opcionales por ingreso/gasto, categoría y texto en la nota.
6. Interpretar fechas usando `America/Argentina/Buenos_Aires`, informar siempre
   el período finalmente consultado y no aceptar rangos mayores a 366 días por
   período en esta primera versión.
7. Paginar internamente consultas agregadas para no depender del límite por
   defecto de PostgREST. Las búsquedas detalladas devolverán como máximo 50
   transacciones, ordenadas de más reciente a más antigua.
8. Enviar a OpenAI únicamente campos necesarios. No se enviarán IDs internos
   de usuario, tokens, claves, códigos de invitación ni filas ajenas a la
   billetera solicitada.
9. Incorporar pruebas deterministas para validación de entrada, fechas,
   límites, autorización, despacho de herramientas y ciclo de Function Calling.
10. Separar todos los totales y comparaciones por `currency_code`; nunca sumar
    silenciosamente importes de monedas diferentes.
11. Renderizar respuestas con Markdown GFM seguro, sin habilitar HTML crudo, y
    resolver consultas por responsable usando `profiles.full_name` asociado a
    `transactions.created_by`, nunca buscando nombres dentro de las notas.
12. Persistir una fila de telemetría por interacción autorizada con pregunta,
    respuesta o error normalizado, modelo, cantidad de llamadas al modelo,
    tokens acumulados, costo estimado en USD con tarifa versionada, timestamps,
    duración total y llamadas de herramientas en orden. Los argumentos
    validados se guardarán, pero no los resultados financieros crudos de las
    herramientas. La escritura será secundaria: si falla, el agente igualmente
    deberá devolver su respuesta.

### Fuera de alcance

- Crear, editar, reclasificar o eliminar transacciones.
- Crear categorías, etiquetas, presupuestos, alertas u objetivos.
- Ejecutar cron, notificaciones o tareas automáticas.
- Persistir el historial completo de una conversación o reconstruir sesiones
  de chat entre recargas.
- Usar embeddings, `pgvector`, RAG, búsqueda web o archivos.
- Ofrecer asesoramiento financiero profesional o predicciones de inversión.
- Consultar simultáneamente varias billeteras.
- Reemplazar las pantallas de analíticas existentes.

## Diseño técnico

### Flujo de ejecución

```text
Browser /assistant
  -> POST /api/financial-agent + JWT + walletId
  -> validar usuario y membresía mediante Supabase/RLS
  -> OpenAI Responses API solicita herramienta
  -> servidor valida argumentos y consulta Supabase
  -> servidor entrega resultado mínimo a OpenAI
  -> GPT-5.6 Luna redacta respuesta
  -> servidor registra telemetría de la interacción en Supabase
  -> browser muestra respuesta y período consultado
```

El controlador del agente vive en el Route Handler de Next.js. En desarrollo
se ejecuta en el servidor local; en producción, en la función serverless de
Vercel. La inferencia del modelo se ejecuta en OpenAI y las consultas de datos
en Supabase.

### Autenticación y autorización

El navegador enviará el `access_token` de la sesión actual en `Authorization`.
El servidor creará un cliente Supabase por solicitud usando la clave pública y
ese encabezado. `auth.getUser(token)` validará la identidad con el servidor de
Auth. Todas las consultas incluirán `wallet_id` y quedarán sujetas a las
políticas RLS existentes.

No se utilizará `service_role`. La autorización no dependerá de IDs enviados
por el modelo ni de metadata editable del usuario.

### Herramientas

Las definiciones usarán JSON Schema estricto, `additionalProperties: false` y
fechas `YYYY-MM-DD`. Los argumentos se validarán nuevamente en servidor; el
JSON generado por el modelo nunca se considera confiable por sí solo.

Las herramientas devolverán JSON pequeño y explícito. Los cálculos monetarios
se harán en código a partir de valores numéricos validados. Una herramienta no
podrá invocar otra ni modificar datos.

### Conversación

El estado visible del chat será local al componente React. Para preguntas de
seguimiento, el cliente reenviará como máximo los últimos ocho mensajes. Al
recargar o cerrar la página se perderá la conversación de la interfaz. Cada
solicitud tendrá un máximo de 1.000 caracteres por pregunta y un límite de
salida apropiado para una respuesta breve.

La tabla `interacciones_agente` no funcionará como memoria del modelo: será
telemetría de producto, con una fila inmutable por solicitud autorizada. RLS
permitirá a cada usuario insertar y leer únicamente sus propias filas. La app
no tendrá permisos de actualización ni borrado sobre esta tabla.

### Privacidad y errores

- `OPENAI_API_KEY` y `OPENAI_MODEL` no tendrán prefijo `NEXT_PUBLIC_`.
- La ruta registrará la pregunta y la respuesta final en la tabla de telemetría
  por decisión explícita de producto. Nunca registrará JWT, claves ni resultados
  financieros crudos devueltos por las herramientas.
- Los errores al usuario serán genéricos; el servidor conservará contexto
  técnico sin datos sensibles.
- El prompt indicará que las respuestas son descriptivas y pueden contener
  errores; no constituyen asesoramiento financiero profesional.
- Si el modelo solicita una herramienta desconocida, excede límites o entrega
  argumentos inválidos, la solicitud terminará de forma controlada.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Acceso a una billetera ajena | JWT validado, cliente por solicitud, filtro `wallet_id`, RLS y prueba negativa. |
| Prompt injection en notas | Tratar notas y resultados como datos no confiables; las herramientas disponibles siguen siendo solo lectura. |
| Exposición excesiva de movimientos | Agregados por defecto, detalle limitado a 50 y campos minimizados. |
| Interpretación incorrecta de fechas | Zona horaria explícita, fecha actual incluida en instrucciones y período consultado visible. |
| Alucinación de cifras | Exigir uso de herramientas para afirmaciones numéricas y basar la respuesta en sus resultados. |
| Suma de monedas incompatibles | Agrupar resultados por `currency_code` y mostrar cada moneda por separado. |
| Atribución incorrecta por persona | Herramienta dedicada basada en la relación `created_by → profiles.full_name`; prohibido inferir responsables desde notas. |
| Markdown o HTML no seguro | Renderer GFM sin HTML crudo y prueba negativa con etiquetas de script. |
| Bucle o costo inesperado | Máximo de seis tool calls, ocho mensajes de contexto y límites de entrada/salida. |
| Caída de OpenAI o Supabase | Error recuperable en UI sin perder ni modificar datos. |
| Límite de PostgREST | Paginación interna para agregados y límite explícito para detalles. |
| Exposición de telemetría sensible | RLS por `usuario_id`, permisos mínimos, filas inmutables y ausencia de resultados crudos de herramientas. |
| Caída de la persistencia de telemetría | Inserción best effort; el fallo se registra sin pregunta ni respuesta y no altera el resultado para el usuario. |

## Plan de implementación

1. Preparar variables de entorno documentadas e instalar versiones fijadas de
   `openai` y el validador de esquemas elegido.
2. Crear utilidades server-side para autenticación, validación de fechas y
   cliente Supabase con contexto JWT.
3. Implementar y probar las cinco herramientas de consulta sin OpenAI.
4. Implementar el ciclo Responses API: respuesta, llamadas de función,
   ejecución, `function_call_output` y respuesta final.
5. Agregar límites, sanitización de errores y minimización de resultados.
6. Construir `/assistant`, conversación en memoria y preguntas sugeridas.
7. Integrar el acceso en el menú inferior y estados responsive/accesibles.
8. Probar fechas exactas, rangos, períodos relativos, comparaciones, filtros,
   billetera ajena, token inválido y fallos de proveedores.
9. Ejecutar lint, tests, build, auditoría de dependencias y validación Tali.
10. Documentar configuración local, despliegue en Vercel, costos y límites.
11. Crear la migración de telemetría con RLS, integrar su escritura y probar
    tokens, herramientas y tolerancia a fallos de persistencia.

## Criterios de aceptación

| # | Criterio | Verifica |
|---|----------|----------|
| CA-1 | Un usuario autenticado puede preguntar desde `/assistant` y recibe una respuesta en español referida a la billetera activa. | Prueba de integración. |
| CA-2 | El agente responde consultas de fecha exacta y rango inclusivo e informa las fechas efectivamente usadas. | Casos deterministas y prueba funcional. |
| CA-3 | El agente resuelve expresiones relativas en `America/Argentina/Buenos_Aires` y compara dos períodos de hasta 366 días cada uno. | Pruebas de fechas y comparación. |
| CA-4 | Solo están disponibles las cinco herramientas declaradas y ninguna realiza INSERT, UPDATE, DELETE, RPC de escritura o herramienta integrada de OpenAI. | Inspección estática y mocks. |
| CA-5 | Un token inválido recibe 401 y un usuario sin acceso a la billetera no obtiene datos. | Pruebas negativas de autorización/RLS. |
| CA-6 | Las búsquedas detalladas entregan como máximo 50 movimientos y los agregados no pierden filas por el límite de PostgREST. | Prueba de límites y paginación. |
| CA-7 | La API key, JWT, IDs de usuario y códigos de invitación no aparecen en respuestas, logs ni bundles cliente. | Búsqueda estática y revisión de build. |
| CA-8 | El historial no se persiste y se limita a ocho mensajes; una recarga inicia una conversación vacía. | Prueba de UI. |
| CA-9 | El ciclo se detiene después de seis tool calls y maneja argumentos o herramientas inválidas sin filtrar detalles internos. | Pruebas unitarias del orquestador. |
| CA-10 | `npm run lint`, tests, `npm run build`, auditoría de seguridad y `tali validate --strict` finalizan sin errores atribuibles al feature. | Comandos de CI/local. |
| CA-11 | Los resúmenes, distribuciones y comparaciones separan importes por moneda y nunca suman monedas distintas. | Pruebas unitarias con ARS y USD. |
| CA-12 | Las respuestas renderizan negritas, listas y tablas GFM sin ejecutar HTML crudo proveniente del modelo. | Prueba de componente y prueba negativa de HTML. |
| CA-13 | Las consultas por persona y mes usan el creador real del movimiento y producen totales deterministas por moneda. | Prueba unitaria y prueba funcional con datos reales. |
| CA-14 | Cada interacción autorizada intenta persistir pregunta, respuesta/error, tiempos, cantidad de llamadas al modelo, tokens acumulados, costo USD estimado con tarifa versionada y herramientas; RLS aísla por usuario y un fallo de persistencia no rompe la respuesta. | Migración, pruebas unitarias y prueba funcional en Supabase. |

## Delegación

→ **DELEGAR A:** Backend para autenticación, herramientas y orquestación;
Frontend para `/assistant`; Security para privacidad, RLS y secretos; QA para
fechas, límites, errores y aislamiento entre billeteras.

→ **CRITERIO DE ACEPTACIÓN:** QA debe demostrar CA-1 a CA-14 con resultados
reproducibles antes de cerrar `verify`.
