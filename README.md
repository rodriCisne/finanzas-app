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
  - Home autenticada (`/(app)/page.tsx`) usa ese hook para mostrar la billetera actual (nombre + moneda).

---

### Transacciones (V1)

#### Resumen mensual y navegación por meses

- Hook `useMonthTransactions(walletId, year, month)`:
  - Filtra transacciones de la billetera activa para el **año/mes seleccionados**.
  - Calcula:
    - Total de ingresos.
    - Total de gastos.
    - Balance (ingresos – gastos).
- En la home:
  - Estado local `{ year, month }`:
    - Inicializado con el año/mes actual.
    - Actualizado con dos botones:
      - `◀` → mes anterior (maneja correctamente salto de enero ↔ diciembre y cambio de año).
      - `▶` → mes siguiente.
  - `monthLabel` se genera con helpers de fecha y muestra textos tipo **“noviembre de 2025”**.
  - La card de resumen muestra siempre los totales del mes seleccionado:
    - Ingresos, gastos y balance formateados con la moneda de la billetera.

#### Listado de transacciones del mes

- Se muestran en `/` debajo del resumen:
  - Fecha formateada correctamente (usando la fecha `date` de la transacción, que es sólo fecha, sin problemas de timezone).
  - Nombre de la categoría (o “Sin categoría”).
  - Nota (si existe).
  - Monto:
    - En verde con `+` para ingresos.
    - En rojo con `-` para gastos.
- Cada ítem de la lista:
  - Es clickeable.
  - Al tocarlo, navega a `/transactions/[id]` para editar la transacción.

---

### Alta, edición y borrado de transacciones

Se reutiliza una **única pantalla de formulario** para crear y editar transacciones:

- Componente `TransactionFormScreen`:
  - Recibe props:
    - `mode: 'create' | 'edit'`
    - `transactionId?: string`
  - Se usa en:
    - `/transactions/new` → `mode="create"`.
    - `/transactions/[id]` → `mode="edit"` + `transactionId` desde la URL.
  - Usa:
    - `useCurrentWallet` para saber la billetera actual.
    - `useCategories(walletId)` para listar categorías.
    - `useTags(walletId)` para listar y crear etiquetas.
- **Campos del formulario**:
  - Tipo: **Gasto / Ingreso** (toggle).
  - Monto (numérico, validado > 0).
  - Fecha:
    - Para nuevas transacciones se inicializa con la **fecha local de hoy** (no en UTC), usando un helper que arma `YYYY-MM-DD` en base a la hora local.
  - Categoría:
    - Select filtrado según tipo: `income` / `expense` / `both`.
  - Etiquetas:
    - Chips seleccionables con todas las etiquetas de la billetera.
    - Caja de texto + botón **“Crear”** para agregar nuevas etiquetas.
  - Nota opcional.
- **Crear transacción (`mode="create"`)**:
  - Inserta en `transactions` con:
    - `wallet_id` = billetera actual.
    - `created_by` = usuario autenticado.
    - `type`, `amount`, `currency_code`, `category_id`, `date`, `note`.
  - Inserta en `transaction_tags` una fila por cada etiqueta seleccionada.
  - Redirige a `/`, donde se actualiza el resumen y la lista del mes correspondiente.
- **Editar transacción (`mode="edit"`)**:
  - Al cargar la pantalla:
    - Hace un `SELECT` de la transacción por `id` + `wallet_id`.
    - Rellena el formulario con los datos existentes (incluyendo etiquetas).
  - Al guardar:
    - Hace `UPDATE` en `transactions` con los nuevos valores.
    - Borra las etiquetas previas de `transaction_tags` para ese `transaction_id`.
    - Inserta de nuevo las etiquetas seleccionadas.
    - Redirige a `/` (la home se refresca con los nuevos datos).
- **Borrado de transacción**:
  - En modo edición aparece un botón de texto **“Eliminar”** en el header.
  - Pide confirmación (`window.confirm`).
  - Si se confirma:
    - Borra primero las filas de `transaction_tags` asociadas.
    - Luego borra la fila en `transactions`.
    - Redirige a `/`, donde la transacción ya no aparece y los totales se recalculan.

---

### Etiquetas y filtros (V1)

#### Etiquetas por billetera

- Hook `useTags(walletId)`:
  - Devuelve **todas las etiquetas de la billetera** (`tags`).
  - Permite refrescar la lista (`refetch`) cuando se crean nuevas etiquetas.

#### Asignación de etiquetas a transacciones

- Desde la pantalla `TransactionFormScreen` (tanto en alta como en edición):
  - Se listan todas las etiquetas existentes de la billetera como chips seleccionables.
  - Se pueden seleccionar **múltiples etiquetas** para una misma transacción.
  - Se puede crear una **nueva etiqueta**:
    - Se guarda en `tags` asociada a la billetera actual.
    - Se actualiza la lista de etiquetas.
    - Se puede marcar automáticamente como seleccionada.

#### Lectura de etiquetas en las transacciones

- `useMonthTransactions` trae, para cada transacción, sus etiquetas asociadas usando un join con `transaction_tags` → `tags`.
- Cada transacción expuesta al frontend tiene un campo `tags: Tag[]`.

#### Panel de filtros por etiqueta en la home

- En la home, arriba de la lista de transacciones, se muestran chips con:

  - `Todas`
  - Una chip por **cada etiqueta de la billetera**, independientemente del mes.

- El filtro funciona así:

  - El estado `selectedTagId` puede ser:
    - `'all'` → sin filtro.
    - `tag.id` → filtra por esa etiqueta.
  - `filteredTransactions` se calcula filtrando las transacciones del mes actual por la etiqueta seleccionada.

- Al cambiar de mes (usando ◀ / ▶):

  - El panel de etiquetas se mantiene igual (mismas etiquetas de la billetera).
  - Lo que cambia es la lista filtrada (transacciones del nuevo mes que tengan esa etiqueta).
  - Si no hay movimientos para ese filtro en ese mes, se muestra el mensaje:
    - **“No hay movimientos para este filtro en este mes.”**

#### Visualización de etiquetas en la tarjeta de transacción

- En cada ítem de la lista, debajo de la nota, se muestran las etiquetas de la transacción como chips (`Sushi`, `Rodri`, etc.).

---

### Diseño / UX

- Layout mobile-first:
  - Contenedor principal `max-w-md mx-auto` → se ve como app de celular centrada en desktop.
  - Fondo oscuro (`bg-slate-950`) y textos claros.
- Botón flotante **“+”**:
  - Fijo en la esquina inferior derecha.
  - Lleva a `/transactions/new`.
  - Inspirado en el FAB de apps tipo Spendee.
- Selector de mes:
  - Ubicado en la card de resumen.
  - Botones ◀ / ▶ y label centrado.
  - Ancho fijo para evitar que el layout “salte” cuando cambia el texto del mes.

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

6. Flujo esperado (V1)
Sin sesión → la ruta / redirige a /auth/login.

Desde /auth/register podés crear una cuenta nueva.

Al registrarte:

El trigger crea perfil + billetera + categorías.

La app redirige a /.

En / ves:

Header con nombre de billetera + moneda.

Card con resumen del mes actual (ingresos / gastos / balance) y selector de mes.

Panel de etiquetas (todas las etiquetas de la billetera).

Lista de transacciones del mes (si hay).

Botón “+”:

Lleva a /transactions/new.

Permite crear un gasto/ingreso, asignar categoría y etiquetas (nuevas o existentes).

Vuelve a / y actualiza el listado + totales + filtros.

Al tocar una transacción en la lista:

Navega a /transactions/[id].

Podés:

Editar sus datos (tipo, monto, fecha, categoría, etiquetas, nota).

Eliminarla.

Al guardar o eliminar:

Vuelve a / con los datos recalculados.

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
    layout.tsx                    # Layout protegido (RequireAuth + diseño mobile)
    page.tsx                      # Home autenticada (resumen + lista + filtros + selector de mes)
    transactions/
      new/
        page.tsx                  # Pantalla de nueva transacción (usa TransactionFormScreen)
      [id]/
        page.tsx                  # Pantalla de edición/borrado de transacción (TransactionFormScreen)

  layout.tsx                      # Root layout (AuthProvider + estilos globales)
  globals.css                     # Tailwind v4 (@import "tailwindcss")

components/
  AuthContext.tsx                 # Contexto de auth (session + user)
  RequireAuth.tsx                 # Protege rutas autenticadas
  transactions/
    TransactionFormScreen.tsx     # Pantalla reutilizable para alta/edición de transacciones

hooks/
  useCurrentWallet.ts             # Hook para obtener billetera actual
  useMonthTransactions.ts         # Hook para transacciones del mes + resumen
  useCategories.ts                # Hook para categorías de la billetera
  useTags.ts                      # Hook para etiquetas de la billetera

lib/
  supabaseClient.ts               # Cliente de Supabase

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
UI para ver todas las billeteras del usuario.

Crear billeteras nuevas.

Invitar miembros a una billetera (gestión de wallet_members).

Roles y permisos sobre transacciones/categorías.

Más analítica
Gráficos por categoría / etiqueta.

Presupuestos por categoría / billetera.

Indicadores de tendencia (mes actual vs mes anterior, etc.).