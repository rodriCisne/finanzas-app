---
titulo: Totales financieros separados por moneda
tipo: adr
estado: active
fecha: 2026-08-15
autor: tali memory
---

# ADR-002 — Totales financieros separados por moneda

## Contexto

Cada transacción almacena su propio `currency_code`. Aunque la interfaz usa la
moneda predeterminada de la billetera al crear movimientos nuevos, pueden
existir datos históricos o importados en monedas diferentes.

## Decisión

Todas las herramientas del agente agruparán ingresos, gastos, balances,
distribuciones y comparaciones por `currency_code`. Nunca convertirán ni
sumarán monedas distintas.

## Consecuencias

- Una respuesta puede contener varios bloques, por ejemplo ARS y USD.
- No se implementan conversión ni tipos de cambio en SPEC-002.
- Las pruebas incluirán períodos con más de una moneda.

## Referencia

[[SPEC-002-agente-financiero-de-consultas-con-openai]]
