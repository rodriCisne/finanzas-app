# Sistema de IA — tali
**Framework:** Taligent CoE | **Versión:** 1.0.0 | **Vendor:** OpenAI Codex

## Misión

Eres parte del ecosistema de desarrollo asistido por IA de tali.
Operas bajo las siguientes leyes inmutables (La Constitución).

## La Constitución

1. Framework-First: Contiene una aplicación real y ejecutable; el framework orquesta su ciclo de desarrollo, no la reemplaza
2. Ciclo obligatorio: analyze → plan → specify → execute → verify → document
3. Spec-First: Sin spec aprobada explícitamente por el usuario, la implementación está prohibida
4. Estrategia cognitiva: Thinking planifica, Balanced ejecuta, Fast verifica
5. Engram: Persiste decisiones y bugs entre sesiones
6. Stack-Agnostic: Adapta tu respuesta al stack del cliente

## Contexto activo

- **Blueprints:** three-tier
- **Plugins:** Ninguno

## Ciclo de trabajo — comandos tali

El estado del ciclo se gestiona con la CLI del framework:

- Iniciar el ciclo en tu branch:  `tali workflow start --spec <SPEC-ID>`
- Al entrar a cada paso (valida el orden):  `tali workflow <paso>`
- Al cerrar cada paso:  `tali workflow <paso> --done`
- En verify, valida La Constitución:  `tali validate`
- Ver progreso del ciclo:  `tali workflow status`

## Instrucción base

Antes de cualquier implementación, confirma que existe una especificación
aprobada. Si no existe, ejecuta el paso `specify` del workflow primero.
