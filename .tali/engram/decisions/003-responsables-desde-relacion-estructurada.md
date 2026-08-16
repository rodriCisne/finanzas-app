---
titulo: Responsables financieros desde relación estructurada
tipo: adr
estado: active
fecha: 2026-08-15
autor: tali memory
---

# ADR-003 — Responsables desde la relación de creador

## Contexto

Las notas de una transacción son texto libre y no identifican de manera fiable
a la persona que realizó el gasto. Inferir responsables buscando nombres en la
nota produjo totales incompletos y ceros incorrectos.

## Decisión

Las consultas por persona usarán exclusivamente la relación
`transactions.created_by → profiles.full_name`. La herramienta
`obtener_gastos_por_persona` calculará totales por período, responsable y
moneda antes de entregar resultados al modelo.

## Consecuencias

- El modelo no infiere responsables desde notas ni categorías.
- Los movimientos sin perfil relacionado se agrupan como `Sin responsable`.
- Los totales por persona conservan la separación por `currency_code`.

## Referencia

[[SPEC-002-agente-financiero-de-consultas-con-openai]]
