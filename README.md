# Finanzas App 💸

MVP de una aplicación de **finanzas personales tipo Spendee**, construida con:

- **Next.js 15** (App Router)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS)

Mobile-first y pensada para evolucionar luego a **PWA**.

---

## 🧱 Estado actual del MVP

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

#### Autenticación y estructura

- **Auth básica**:
  - Registro (`/auth/register`) con nombre, email y contraseña.
  - Login (`/auth/login`) con email y contraseña.
  - Cierre de sesión con `signOut`.
- **Gestión de sesión**:
  - `AuthProvider` (contexto React) mantiene `session`, `user` y `loading`.
  - `RequireAuth` protege todas las rutas dentro del grupo `/(app)`:
    - Si no hay usuario → redirige a `/auth/login`.
- **Billetera personal**:
  - Hook `useCurrentWallet`:
    - Busca en `wallet_members` la primera billetera del usuario (por ahora “Personal”).
    - Trae su info desde `wallets` (id, nombre, moneda por defecto).
  - Home autenticada (`/(app)/page.tsx`) usa ese hook para mostrar la billetera actual.

#### UI de transacciones (Fase 2)

- **Resumen mensual** en la home:
  - Hook `useMonthTransactions(walletId)`:
    - Filtra transacciones del **mes actual** para la billetera activa.
    - Calcula:
      - Total de ingresos.
      - Total de gastos.
      - Balance (ingresos – gastos).
  - Card en el header que muestra:
    - Mes actual (ej. “noviembre de 2025”).
    - Ingresos, gastos y balance formateados con la moneda de la billetera.
- **Listado de transacciones del mes**:
  - Se muestran en `/` debajo del resumen:
    - Fecha (ajustada correctamente a la zona horaria, evitando el bug del “día menos”).
    - Nombre de la categoría (o “Sin categoría”).
    - Nota (si existe).
    - Monto:
      - En verde con `+` para ingresos.
      - En rojo con `-` para gastos.
- **Alta de transacciones**:
  - Pantalla `/transactions/new` (ruta protegida dentro de `/(app)`):
    - Tipo: **Gasto / Ingreso** (toggle).
    - Monto (numérico, validado > 0).
    - Fecha (date input).
    - Categoría (select filtrado según tipo: income/expense/both).
    - Nota opcional.
  - Hook `useCategories(walletId)` para listar categorías de la billetera.
  - Al guardar:
    - Inserta en `transactions` con:
      - `wallet_id` de la billetera actual.
      - `created_by` = usuario autenticado.
      - `currency_code` = moneda default de la billetera.
    - Redirige a `/`, donde la nueva transacción ya aparece en la lista y actualiza los totales.

#### Diseño / UX

- Layout mobile-first:
  - Contenedor principal `max-w-md mx-auto` → se ve como app de celular, centrada en desktop.
  - Fondo oscuro (`bg-slate-950`) y textos claros.
- Botón flotante **“+”**:
  - Fijo en la esquina inferior derecha.
  - Lleva a `/transactions/new`.
  - Inspirado en el FAB de apps tipo Spendee.

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
bash
Copiar código
npm install
3. Variables de entorno
Crear un archivo .env.local en la raíz con:

env
Copiar código
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
bash
Copiar código
npm run dev
Abrir http://localhost:3000.

Flujo esperado:

Sin sesión → la ruta / redirige a /auth/login.

Desde /auth/register podés crear una cuenta nueva.

Al registrarte:

El trigger crea perfil + billetera + categorías.

La app redirige a /.

En / ves:

Header con nombre de billetera + moneda.

Card con resumen del mes actual.

Lista de transacciones del mes (si hay).

Botón “+”:

Lleva a /transactions/new.

Permite crear un gasto/ingreso.

Vuelve a / y actualiza el listado + totales.

📁 Estructura de carpetas (simplificada)
txt
Copiar código
app/
  (auth)/
    auth/
      login/
        page.tsx        # Login
      register/
        page.tsx        # Registro
  (app)/
    layout.tsx          # Layout protegido (RequireAuth + diseño mobile)
    page.tsx            # Home autenticada (resumen + lista de transacciones)
    transactions/
      new/
        page.tsx        # Pantalla de nueva transacción
  layout.tsx            # Root layout (AuthProvider + estilos globales)
  globals.css           # Tailwind v4 (@import "tailwindcss")

components/
  AuthContext.tsx       # Contexto de auth (session + user)
  RequireAuth.tsx       # Protege rutas autenticadas

hooks/
  useCurrentWallet.ts   # Hook para obtener billetera actual
  useMonthTransactions.ts # Hook para transacciones del mes + resumen
  useCategories.ts      # Hook para categorías de la billetera

lib/
  supabaseClient.ts     # Cliente de Supabase

utils/
  date.ts               # Helpers de fechas (rango de mes actual, labels)

docs/
  db-schema.md          # Documentación de la base (Fase 1)

.env.local              # Variables de entorno (ignore en git)
🗺️ Roadmap (próximas fases)
Fase 3 – Etiquetas

CRUD de etiquetas.

Asignar etiquetas a transacciones (N:N).

Filtros por etiqueta en la home.

Fase 4 – PWA

Web App Manifest.

Service Worker y caching básico.

Test de instalabilidad (Lighthouse / Chrome).

Fase 5 – Billeteras compartidas

UI para ver todas las billeteras del usuario.

Invitar miembros a una billetera (gestión de wallet_members).

Roles y permisos sobre transacciones/categorías.