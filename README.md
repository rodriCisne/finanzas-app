# Finanzas App 💸

MVP de una aplicación de **finanzas personales tipo Spendee**, construida con:

- **Next.js 15** (App Router)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS)

Mobile-first y pensada para evolucionar luego a **PWA**.

---

## 🧱 Estado actual (MVP – Fase 1)

### Backend / Base de datos (Supabase)

- Esquema con:
  - `profiles` – perfil del usuario (moneda por defecto, etc.).
  - `wallets` – billeteras/cuentas (ej. “Personal”).
  - `wallet_members` – usuarios que comparten una billetera (owner / member).
  - `categories` – categorías de gastos/ingresos por billetera.
  - `tags` – etiquetas por billetera.
  - `transactions` – gastos e ingresos.
  - `transaction_tags` – relación N:N entre transacciones y etiquetas.
- Trigger `handle_new_user`:
  - Crea `profile` al registrarse un usuario.
  - Crea billetera **“Personal”** (moneda ARS).
  - Agrega al usuario como `owner` de esa billetera.
  - Crea categorías por defecto (Comida y bebida, Transporte, Salud, Entretenimiento, Sueldo).
- Row Level Security (RLS) configurado:
  - Cada usuario ve solo:
    - Sus billeteras (`wallets` donde es miembro).
    - Sus categorías / tags / transacciones asociadas a billeteras donde es miembro.

> El detalle completo del esquema y todas las policies está documentado en  
> **`docs/db-schema.md`** (Fase 1 de la base de datos).

---

### Frontend / App

- **Auth básica**:
  - Registro (`/auth/register`) con nombre, email y contraseña.
  - Login (`/auth/login`) con email y contraseña.
  - Cierre de sesión.
- **Gestión de sesión**:
  - `AuthProvider` (contexto React) que mantiene `session` y `user`.
  - `RequireAuth` que protege todas las rutas dentro del grupo `/(app)`.
- **Billetera personal**:
  - Hook `useCurrentWallet` que:
    - Busca la primera billetera donde el usuario es miembro en `wallet_members`.
    - Trae la info de esa billetera desde `wallets`.
  - Home autenticada (`/(app)/page.tsx`) muestra:
    - Nombre de la billetera (ej. “Personal”).
    - Moneda por defecto.
    - Tarjeta de placeholder para el balance mensual.

Layout mobile-first:

- Contenedor `max-w-md mx-auto` para que en desktop se vea como una columna centrada tipo app mobile.
- Paleta dark (`bg-slate-950`, `text-slate-50`) preparada para PWA.

---

## 🧰 Stack técnico

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4
- **Backend as a Service**: Supabase
  - Auth (Email + Password)
  - PostgreSQL + RLS
- **Herramientas**:
  - ESLint
  - PostCSS

---

## 🚀 Cómo levantar el proyecto en local

### 1. Clonar el repo

```bash
git clone https://github.com/<TU_USUARIO>/finanzas-app.git
cd finanzas-app


2. Instalar dependencias
npm install

3. Variables de entorno

Crear un archivo .env.local en la raíz con:

NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY


Los valores se obtienen desde:

Supabase → Settings → API → Project URL y anon public.

Importante: .env.local está en .gitignore y no debe commitearse.

4. Supabase – preparar la base

Crear un proyecto en Supabase.

Ejecutar los scripts SQL en este orden:

currencies + seeds iniciales.

profiles, wallets, wallet_members.

categories, tags, transactions, transaction_tags.

Trigger handle_new_user.

RLS + policies.

Crear un usuario de prueba desde Auth → Users y verificar que:

Se crea profile.

Se crea billetera Personal.

Se agregan categorías por defecto.

Los scripts y explicación paso a paso están en docs/db-schema.md.

5. Levantar el dev server
npm run dev


Abrir http://localhost:3000.

Flujo esperado:

Sin sesión → la ruta / redirige a /auth/login.

Desde /auth/register podés crear una cuenta nueva.

Al registrarte se dispara el trigger en Supabase, se crea la billetera Personal y la app redirige a /.

En / ves el header con nombre de billetera + moneda y un placeholder de balance.

📁 Estructura de carpetas (simplificada)
app/
  (auth)/
    auth/
      login/
        page.tsx      # Login
      register/
        page.tsx      # Registro
  (app)/
    layout.tsx        # Layout protegido (RequireAuth + contenedor mobile)
    page.tsx          # Home autenticada (billetera actual)
  layout.tsx          # Root layout (AuthProvider + estilos globales)
  globals.css         # Tailwind v4 (@import "tailwindcss")

components/
  AuthContext.tsx     # Contexto de auth (session + user)
  RequireAuth.tsx     # Protege rutas autenticadas

hooks/
  useCurrentWallet.ts # Hook para obtener billetera actual

lib/
  supabaseClient.ts   # Cliente de Supabase

docs/
  db-schema.md        # Documentación de la base (Fase 1)

.env.local            # Variables de entorno (ignore en git)