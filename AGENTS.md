# Guía para Agentes de IA en Finanzas App

Este documento (AGENTS.md) establece las reglas de oro y mejores prácticas que todos los asistentes y agentes de inteligencia artificial deben seguir al trabajar en esta aplicación de Finanzas Personales.

## 1. Reglas Generales
- **Idioma y Tono**: Toda la comunicación, documentación y código (comentarios, nombres de variables descriptivas en español, textos de UI) deben estar **estrictamente en español (Latinoamericano)**.
- **Proactividad Acotada**: Sé proactivo en la detección de bugs o resolución de problemas obvios, pero consulta al desarrollador antes de realizar cambios arquitectónicos, eliminar archivos o sobrescribir flujos complejos.

## 2. Stack Tecnológico
- **Core**: Next.js (App Router), React, TypeScript.
- **Backend / Base de Datos**: Supabase (Postgres, Edge Functions). Para cualquier diseño de DB o función en Supabase, utiliza los patrones establecidos y consulta los schemas existentes.
- **Estilos**: Vanilla CSS y Tailwind CSS (guiado por el skill `baseline-ui`).

## 3. Diseño y Estética
- **UI "Wowie"**: La interfaz debe sentirse moderna, dinámica y premium.
- **Principios**: Utiliza paletas de colores armoniosas, espaciado adecuado, modales con soporte para "glassmorphism", transiciones suaves y microinteracciones donde aporten valor. Nada de "slop" genérico.

## 4. Seguridad
- Utiliza las mejores prácticas de validación de datos (zod, conform, o validaciones nativas).
- Protege todas las rutas de la API, Server Actions y la Database mediante RLS (Row Level Security) en Supabase.
- Evita el uso de credenciales en texto plano; refiérete siempre a variables de entorno.

## 5. Workflows
- **Commits y Despliegue**: Se dispone del workflow `/safe-commit` para empaquetar de forma segura los cambios. Consulta los archivos en `.agents/workflows/` para detalles de uso.
- **Pruebas End-to-End**: Para QA general e integraciones críticas, apóyate en el skill `e2e-testing-patterns` y considera armar pruebas si el feature lo requiere.

## 6. Estructura de Archivos
- **`app/`**: Rutas de Next.js, Layouts y Server Components.
- **`components/`**: Componentes reutilizables de UI.
- **`lib/` / `utils/`**: Utilidades, configuración de Supabase, tipos de TypeScript (generados o manuales).
- **`hook/`**: Custom hooks de React.

*Mantén este archivo actualizado conforme evolucione el proyecto. Su contenido dicta la directriz de trabajo.*
