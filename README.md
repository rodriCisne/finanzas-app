Finanzas App 💸

MVP de una aplicación de finanzas personales tipo Spendee, construida con:

Next.js 15 (App Router)

Tailwind CSS v4

Supabase (PostgreSQL + Auth + RLS)

Mobile-first y pensada para evolucionar luego a PWA.

🧱 Estado actual del MVP (V1)
Backend / Base de datos (Supabase)

Esquema con:

profiles – perfil del usuario (moneda por defecto, etc.).

wallets – billeteras/cuentas (ej. “Personal”).

wallet_members – usuarios que comparten una billetera (owner / member).

categories – categorías de gastos/ingresos por billetera.

tags – etiquetas por billetera.

transactions – gastos e ingresos.

transaction_tags – relación N:N entre transacciones y etiquetas.

Trigger handle_new_user:

Crea profile al registrarse un usuario.

Crea billetera “Personal” (moneda ARS).

Agrega al usuario como owner de esa billetera.

Crea categorías por defecto (Comida y bebida, Transporte, Salud, Entretenimiento, Sueldo).

Row Level Security (RLS) configurado:

Cada usuario ve solo:

Sus billeteras (por membresía en wallet_members).

Sus categorías / tags / transacciones asociadas a billeteras donde es miembro.

El detalle completo del esquema y todas las policies está documentado en
docs/db-schema.md.

🖥️ Frontend / App
Autenticación y estructura

Auth básica:

Registro (/auth/register) con nombre, email y contraseña.

Login (/auth/login) con email y contraseña.

Cierre de sesión con signOut.

Gestión de sesión:

AuthProvider (contexto React) mantiene session, user y loading.

RequireAuth protege todas las rutas dentro del grupo /(app):

Si no hay usuario → redirige a /auth/login.

👛 Billeteras (Base para “billeteras compartidas”)

En esta etapa se incorporó el concepto de billetera activa y una UI para listar/seleccionar/crear/editar billeteras.

WalletProvider (billetera activa)

WalletProvider (components/WalletContext.tsx):

Carga todas las billeteras del usuario consultando wallet_members → join con wallets.

Mantiene:

wallets: lista de billeteras del usuario.

currentWalletId: id de la billetera seleccionada.

currentWallet: billetera activa (objeto completo).

loading: estado de carga.

Persiste la billetera activa en localStorage (finanzas.currentWalletId) para que se mantenga al refrescar.

Si no existe selección previa o es inválida, toma la primera billetera del usuario como default.

Incluye campos adicionales provenientes de wallets como invite_code (cuando existe en BD).

El WalletProvider vive dentro del layout protegido app/(app)/layout.tsx, por lo que:

solo existe para usuarios autenticados,

y todas las pantallas del grupo /(app) pueden acceder a la billetera activa.

Pantalla de billeteras

Ruta /(app)/wallets

Lista todas las billeteras del usuario.

Permite seleccionar una billetera como activa.

Al seleccionar:

setea currentWalletId

redirige a / (Home) para ver datos de esa billetera.

Crear billetera

Ruta /(app)/wallets/new

Form para crear una billetera con:

nombre

moneda por defecto

Llama a una RPC en Supabase: create_wallet(name, default_currency_code)

Inserta fila en wallets

Inserta fila en wallet_members como owner

Devuelve el wallet_id

Al crear:

deja esa billetera como activa (setCurrentWalletId)

refresca lista (refetchWallets)

redirige a /

Nota: si tu tabla wallets tiene owner_id NOT NULL, la RPC debe setear owner_id = auth.uid().

Editar billetera (nombre / moneda) + compartir código

Ruta /(app)/wallets/[id]/edit

Permite editar:

name

default_currency_code

Muestra invite_code de la billetera (si existe) en un input de solo lectura.

Incluye botón “Copiar” para copiar el código al portapapeles.

El objetivo del código es habilitar el MVP de invitaciones por código/link (fase v2).

Integración con el resto de la app

Home y hooks principales usan currentWallet (billetera activa) para:

listar transacciones del mes,

calcular resumen,

filtrar etiquetas y categorías.

TransactionFormScreen usa la moneda de la billetera (wallet.default_currency_code) como currency_code al crear transacciones.

💳 Transacciones (V1)
Resumen mensual y navegación por meses

Hook useMonthTransactions(walletId, year, month):

Filtra transacciones de la billetera activa para el año/mes seleccionados.

Calcula:

Total de ingresos.

Total de gastos.

Balance (ingresos – gastos).

En la home:

Estado local { year, month } inicializado con el mes actual.

Botones ◀ / ▶:

navegan correctamente entre meses y años (enero ↔ diciembre).

monthLabel muestra textos tipo “noviembre de 2025”.

La card de resumen muestra totales del mes seleccionado, formateados con la moneda de la billetera.

Listado de transacciones del mes

Se muestran en / debajo del resumen:

Fecha (de transactions.date, fecha “contable” sin timezone).

Nombre de categoría (o “Sin categoría”).

Nota (si existe).

Monto:

verde + para ingresos

rojo - para gastos

Cada ítem es clickeable y navega a /transactions/[id] para editar.

✍️ Alta, edición y borrado de transacciones

Se reutiliza una única pantalla para crear y editar:

Form reutilizable

TransactionFormScreen:

Props:

mode: 'create' | 'edit'

transactionId?: string

Se usa en:

/transactions/new → mode="create"

/transactions/[id] → mode="edit" + transactionId

Usa:

currentWallet para billetera activa

useCategories(walletId) para categorías

useTags(walletId) para etiquetas

Crear transacción (mode="create")

Inserta en transactions con:

wallet_id, created_by, type, amount, currency_code, category_id, date, note

Inserta en transaction_tags una fila por etiqueta seleccionada.

Redirige a /.

Editar transacción (mode="edit")

Carga con SELECT por id + wallet_id.

Al guardar:

UPDATE transactions

borra tags previos (DELETE transaction_tags)

inserta nuevos tags

Redirige a /.

Borrado

En modo edición aparece botón Eliminar con confirmación.

Borra transaction_tags → luego borra transactions → vuelve a /.

🏷️ Etiquetas y filtros (V1)
Etiquetas por billetera

Hook useTags(walletId):

Devuelve todas las etiquetas de la billetera.

Permite refetch().

Asignación de etiquetas

En TransactionFormScreen:

chips multi-select

crear etiqueta nueva (insert en tags + refetch)

Lectura de etiquetas

useMonthTransactions trae tags: Tag[] con join transaction_tags → tags.

Panel de filtros (Home)

Chips:

Todas

una chip por cada etiqueta de la billetera (siempre visibles cambie o no el mes)

El filtro aplica sobre transacciones del mes.

Si no hay movimientos para ese filtro en ese mes:

“No hay movimientos para este filtro en este mes.”

🎨 Diseño / UX

Mobile-first:

max-w-md mx-auto para simular app móvil en desktop.

fondo oscuro bg-slate-950.

FAB “+” fijo abajo a la derecha → /transactions/new.

Selector de mes con ancho fijo para evitar saltos de layout.

🧰 Stack técnico

Framework: Next.js (App Router)

Lenguaje: TypeScript

Estilos: Tailwind CSS v4

Backend: Supabase (Auth + Postgres + RLS)

Tooling: ESLint, PostCSS

🚀 Cómo levantar el proyecto en local
1) Clonar
git clone https://github.com/<TU_USUARIO>/finanzas-app.git
cd finanzas-app

2) Instalar dependencias
npm install

3) Variables de entorno

Crear .env.local:

NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY


.env.local está en .gitignore.

4) Supabase – preparar la base

Crear proyecto en Supabase.

Ejecutar scripts SQL en este orden:

currencies + seeds iniciales

profiles, wallets, wallet_members

categories, tags, transactions, transaction_tags

Trigger handle_new_user

RLS + policies

Los scripts y la explicación están en docs/db-schema.md.

5) RPC necesaria para crear billeteras (/wallets/new)

Crear la función create_wallet en Supabase.

Ejemplo:

create or replace function public.create_wallet(
  p_name text,
  p_default_currency_code text
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_wallet_id uuid;
begin
  insert into public.wallets (name, default_currency_code)
  values (trim(p_name), upper(trim(p_default_currency_code)))
  returning id into v_wallet_id;

  insert into public.wallet_members (wallet_id, user_id, role)
  values (v_wallet_id, auth.uid(), 'owner');

  return v_wallet_id;
end;
$$;

grant execute on function public.create_wallet(text, text) to authenticated;


Si wallets.owner_id es NOT NULL: incluir owner_id = auth.uid() en el insert.

6) Levantar dev server
npm run dev


Abrir http://localhost:3000.

7) Flujo esperado (V1)

Sin sesión → / redirige a /auth/login

Registro → crea profile + billetera + categorías → redirige a /

En /:

billetera activa + moneda

resumen mensual + selector de mes

panel de etiquetas

lista de transacciones del mes

FAB “+” → crear transacción

Click en transacción → /transactions/[id] → editar/eliminar

/wallets:

lista billeteras y permite elegir activa

/wallets/new:

crea una billetera nueva y la deja activa

/wallets/[id]/edit:

editar nombre/moneda

ver invite_code y copiarlo (si existe)

📁 Estructura de carpetas (simplificada)
app/
  (auth)/
    auth/
      login/page.tsx
      register/page.tsx

  (app)/
    layout.tsx
    page.tsx
    wallets/
      page.tsx
      new/page.tsx
      [id]/edit/page.tsx
    transactions/
      new/page.tsx
      [id]/page.tsx

  layout.tsx
  globals.css

components/
  AuthContext.tsx
  RequireAuth.tsx
  WalletContext.tsx
  transactions/
    TransactionFormScreen.tsx

hooks/
  useMonthTransactions.ts
  useCategories.ts
  useTags.ts

lib/
  supabaseClient.ts

utils/
  date.ts

docs/
  db-schema.md

.env.local

🗺️ Roadmap (próximas fases)
PWA

Web App Manifest

Service Worker + caching básico

Instalabilidad (Lighthouse)

Billeteras compartidas (v2)

Ver detalle de billetera (miembros / rol)

Invitar miembros a una billetera (gestión de wallet_members)

MVP: invitaciones por código/link (importar billetera con invite_code)

Evolución: invitación por email con Edge Functions

Más analítica

Gráficos por categoría / etiqueta

Presupuestos por categoría / billetera

Tendencias (mes actual vs mes anterior)