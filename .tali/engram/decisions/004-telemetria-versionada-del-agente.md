---
titulo: Telemetría versionada del agente financiero
tipo: adr
estado: active
fecha: 2026-08-15
autor: tali memory
---

# ADR-004 — Telemetría versionada del agente financiero

## Contexto

Para evaluar calidad, latencia y costo del agente se necesita observar cada
interacción sin convertir la tabla en memoria conversacional ni duplicar todos
los movimientos financieros consultados por las herramientas.

## Decisión

Se persistirá una fila inmutable en `public.interacciones_agente` por solicitud
autorizada. La fila incluirá pregunta, respuesta o error normalizado, tiempos,
modelo, tokens, cantidad de llamadas al modelo y herramientas, y costo estimado
en USD. Las herramientas guardarán nombre, argumentos validados, orden,
duración y estado, pero no sus resultados financieros crudos.

El costo se calculará por cada respuesta del proveedor usando una tarifa
versionada. Si el modelo configurado no posee una tarifa conocida, el costo se
guardará como nulo. La factura del proveedor seguirá siendo la fuente
definitiva.

RLS limitará `SELECT` e `INSERT` al usuario propietario de la interacción. La
aplicación no tendrá permisos de actualización ni borrado. La escritura será
best effort: un fallo de telemetría nunca debe impedir la respuesta del agente.

## Consecuencias

- Preguntas y respuestas se consideran información financiera sensible.
- La tabla sirve para analítica de producto, no como auditoría forense.
- Los cambios de precio no alteran retroactivamente filas ya calculadas.
- El historial visible del chat continúa siendo temporal y no se reconstruye
  desde esta tabla.

## Referencia

[[SPEC-002-agente-financiero-de-consultas-con-openai]]
