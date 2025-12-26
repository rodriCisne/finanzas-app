# Finanzas App 💸

MVP de una aplicación de **finanzas personales tipo Spendee**, construida con:

- **Next.js 15** (App Router)
- **Tailwind CSS v4**
- **Supabase** (PostgreSQL + Auth + RLS)

Mobile-first y pensada para evolucionar luego a **PWA**.

---

## 🧱 Estado actual del MVP (V1)

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

## 🖥️ Frontend / App

### Autenticación y estructura

- **Auth básica**:
  - Registro (`/auth/register`) con nombre, email y contraseña.
  - Login (`/auth/login`) con email y contraseña.
  - Cierre de sesión con `signOut`.
- **Gestión de sesión**:
  - `AuthProvider` (contexto React) mantiene `session`, `user` y `loading`.
  - `RequireAuth` protege todas las rutas dentro del grupo `/(app)`:
    - Si no hay usuario → redirige a `/auth/login`.

---

## 👛 Billeteras (Base para “billeteras compartidas”)

En esta etapa se incorporó el concepto de **billetera activa** y una UI para listar/seleccionar billeteras del usuario.

### WalletProvider (billetera activa)

- Se agregó `WalletProvider` (`components/WalletContext.tsx`):
  - Carga todas las billeteras del usuario consultando `wallet_members` → join con `wallets`.
  - Mantiene:
    - `wallets`: lista de billeteras del usuario.
    - `currentWalletId`: id de la billetera seleccionada.
    - `currentWallet`: billetera activa (objeto completo).
    - `loading`: estado de carga.
  - Persiste la billetera activa en `localStorage` (`finanzas.currentWalletId`) para que se mantenga al refrescar.
  - Si no existe selección previa o es inválida, toma la primera billetera del usuario como default.
- El `WalletProvider` vive dentro del layout protegido `app/(app)/layout.tsx`, por lo que:
  - solo existe para usuarios autenticados,
  - y todas las pantallas del grupo `/(app)` pueden acceder a la billetera activa.

### Pantalla de billeteras

- Se agregó la ruta: `/(app)/wallets`
  - Lista todas las billeteras del usuario.
  - Permite seleccionar una billetera.
  - Al seleccionar:
    - setea `currentWalletId`
    - redirige a `/` (Home) para ver datos de esa billetera.

### Integración con el resto de la app

- La Home y los hooks principales usan `currentWallet` (billetera activa) para:
  - listar transacciones del mes,
  - calcular resumen,
  - filtrar etiquetas y categorías.

> Próximos pasos: creación de billeteras nuevas e invitaciones (gestión de `wallet_members`).

---

## 💳 Transacciones (V1)

### Resumen mensual y navegación por meses

- Hook `useMonthTransactions(walletId, year, month)`:
  - Filtra transacciones de la billetera activa para el **año/mes seleccionados**.
  - Calcula:
    - Total de ingresos.
    - Total de gastos.
    - Balance (ingresos – gastos).
- En la home:
  - Estado local `{ year, month }`:
    - Inicializado con el año/mes actual.
    - Botones:
      - `◀` → mes anterior (maneja correctamente salto de enero ↔ diciembre y cambio de año).
      - `▶` → mes siguiente.
  - `monthLabel` se genera con helpers y muestra textos tipo **“noviembre de 2025”**.
  - Card de resumen muestra totales del mes seleccionado:
    - Ingresos, gastos y balance formateados con la moneda de la billetera.

### Listado de transacciones del mes

- Se muestran en `/` debajo del resumen:
  - Fecha (de `transactions.date`, es una fecha “contable” sin timezone).
  - Nombre de la categoría (o “Sin categoría”).
  - Nota (si existe).
  - Monto:
    - Verde con `+` para ingresos.
    - Rojo con `-` para gastos.
- Cada ítem:
  - Es clickeable y navega a `/transactions/[id]` para editar.

---

## ✍️ Alta, edición y borrado de transacciones

Se reutiliza una **única pantalla de formulario** para crear y editar transacciones:

### Form reutilizable

- Componente `TransactionFormScreen`:
  - Props:
    - `mode: 'create' | 'edit'`
    - `transactionId?: string`
  - Se usa en:
    - `/transactions/new` → `mode="create"`.
    - `/transactions/[id]` → `mode="edit"` + `transactionId` desde la URL.
  - Usa:
    - `currentWallet` (billetera activa) para trabajar sobre esa billetera.
    - `useCategories(walletId)` para categorías.
    - `useTags(walletId)` para etiquetas.

### Crear transacción (`mode="create"`)

- Inserta en `transactions` con:
  - `wallet_id` = billetera activa.
  - `created_by` = usuario autenticado.
  - `type`, `amount`, `currency_code`, `category_id`, `date`, `note`.
- Inserta en `transaction_tags` una fila por cada etiqueta seleccionada.
- Redirige a `/`, donde se actualiza resumen/lista del mes.

### Editar transacción (`mode="edit"`)

- Al cargar:
  - `SELECT` por `id` + `wallet_id`.
  - Rellena form (incluye etiquetas).
- Al guardar:
  - `UPDATE` en `transactions`.
  - Borra etiquetas previas en `transaction_tags`.
  - Inserta nuevas etiquetas seleccionadas.
  - Redirige a `/`.

### Borrado de transacción

- En modo edición aparece un botón **“Eliminar”**.
- Pide confirmación (`window.confirm`).
- Si se confirma:
  - Borra primero filas de `transaction_tags`.
  - Luego borra `transactions`.
  - Redirige a `/` y se recalculan totales.

---

## 🏷️ Etiquetas y filtros (V1)

### Etiquetas por billetera

- Hook `useTags(walletId)`:
  - Devuelve **todas las etiquetas de la billetera**.
  - Permite `refetch()`.

### Asignación de etiquetas

- En `TransactionFormScreen`:
  - Chips seleccionables (multi-select).
  - Crear nueva etiqueta:
    - Inserta en `tags`.
    - Refresca la lista.
    - (Opcional) la selecciona.

### Lectura de etiquetas

- `useMonthTransactions` trae `tags: Tag[]` con join `transaction_tags` → `tags`.

### Panel de filtros por etiqueta (Home)

- Chips:
  - `Todas`
  - Una chip por **cada etiqueta de la billetera** (siempre se ven, cambie o no el mes).
- El filtro aplica sobre las transacciones del mes actual:
  - Si no hay movimientos para ese filtro en el mes, se muestra:
    - **“No hay movimientos para este filtro en este mes.”**

### Visualización en tarjetas

- En cada transacción se muestran sus etiquetas como chips pequeños.

---

## 🎨 Diseño / UX

- Mobile-first:
  - Contenedor `max-w-md mx-auto` para simular app móvil en desktop.
  - Fondo oscuro (`bg-slate-950`) y textos claros.
- FAB “+”:
  - Fijo abajo a la derecha.
  - Lleva a `/transactions/new`.
- Selector de mes:
  - En la card de resumen con botones ◀/▶.
  - Ancho fijo para evitar “saltos” cuando cambia el texto del mes.

---

## 🧰 Stack técnico

- **Framework**: Next.js (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4
- **Backend**: Supabase
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
Crear .env.local:

env
Copiar código
NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
Se obtienen desde:

Supabase → Settings → API → Project URL y anon public.

Importante: .env.local está en .gitignore.

4. Supabase – preparar la base
Crear proyecto en Supabase.

Ejecutar scripts SQL en este orden:

currencies + seeds iniciales.

profiles, wallets, wallet_members.

categories, tags, transactions, transaction_tags.

Trigger handle_new_user.

RLS + policies.

Crear usuario de prueba desde Auth → Users y verificar:

se crea profile,

se crea billetera Personal,

se crean categorías por defecto.

Los scripts y explicación paso a paso están en docs/db-schema.md.

5. Levantar el dev server
bash
Copiar código
npm run dev
Abrir http://localhost:3000.

6. Flujo esperado (V1)
Sin sesión → / redirige a /auth/login.

Registro → crea perfil + billetera + categorías → redirige a /.

En /:

Header con billetera activa + moneda.

Resumen mensual + selector de mes.

Panel de etiquetas.

Lista de transacciones del mes (si hay).

FAB “+” → /transactions/new → crea transacción y vuelve a /.

Click en transacción → /transactions/[id] → editar o eliminar.

/wallets:

lista billeteras del usuario,

permite seleccionar billetera activa y volver a /.

📁 Estructura de carpetas (simplificada)
txt
Copiar código
app/
  (auth)/
    auth/
      login/
        page.tsx                  # Login
      register/
        page.tsx                  # Registro

  (app)/
    layout.tsx                    # Layout protegido (RequireAuth + WalletProvider + diseño mobile)
    page.tsx                      # Home (resumen + lista + filtros + selector de mes)
    wallets/
      page.tsx                    # Lista/selección de billeteras
    transactions/
      new/
        page.tsx                  # Nueva transacción (usa TransactionFormScreen)
      [id]/
        page.tsx                  # Editar/eliminar transacción (TransactionFormScreen)

  layout.tsx                      # Root layout (AuthProvider + estilos globales)
  globals.css                     # Tailwind v4 (@import "tailwindcss")

components/
  AuthContext.tsx                 # Contexto de auth (session + user)
  RequireAuth.tsx                 # Protege rutas autenticadas
  WalletContext.tsx               # WalletProvider + billetera activa
  transactions/
    TransactionFormScreen.tsx     # Form reutilizable (create/edit)

hooks/
  useMonthTransactions.ts         # Transacciones del mes + resumen
  useCategories.ts                # Categorías por billetera
  useTags.ts                      # Etiquetas por billetera

lib/
  supabaseClient.ts               # Cliente Supabase

utils/
  date.ts                         # Helpers de fechas (rango de mes, label, fecha local hoy)

docs/
  db-schema.md                    # Documentación de la base (Fase 1)

.env.local                        # Variables de entorno (ignore en git)
🗺️ Roadmap (próximas fases posibles)
PWA
Web App Manifest.

Service Worker y caching básico.

Test de instalabilidad (Lighthouse / Chrome).

Billeteras compartidas (v2)
Crear billeteras nuevas (UI + RPC atómica).

Ver detalle de billetera (miembros / rol).

Invitar miembros a una billetera (gestión de wallet_members).

MVP: invitaciones por código/link.

Evolución: invitación por email con Edge Functions.

Más analítica
Gráficos por categoría / etiqueta.

Presupuestos por categoría / billetera.

Indicadores de tendencia (mes actual vs mes anterior).