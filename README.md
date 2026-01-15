# Finanzas App 💸

MVP de una aplicación de finanzas personales tipo Spendee, diseñada con un enfoque **mobile-first** y preparada para evolucionar hacia una **PWA**.

## 🚀 Tecnologías Principales
- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS)
- **Lenguaje:** TypeScript (Tipado estricto y sin `any`)

---

## 🧱 Estado actual del MVP (V1)

### 🗄️ Backend / Base de Datos
El esquema está diseñado en Supabase e incluye las siguientes tablas primordiales:
- `profiles`: Perfil del usuario (moneda por defecto, etc.).
- `wallets`: Billeteras o cuentas (ej. "Personal").
- `wallet_members`: Gestión de acceso (owner / member).
- `categories`: Categorías de gastos/ingresos por billetera.
- `tags`: Etiquetas por billetera.
- `transactions`: Registro de movimientos financieros.
- `transaction_tags`: Relación N:N entre transacciones y etiquetas.

#### Automatización y Seguridad
- **Trigger `handle_new_user`**: Al registrarse, crea automáticamente un perfil, una billetera "Personal" (ARS) y categorías básicas.
- **Row Level Security (RLS)**: Configurado para garantizar que los usuarios solo accedan a sus propias billeteras y datos relacionados.
- *Detalle completo en:* `docs/db-schema.md`.

### 🖥️ Frontend / Funcionalidades core

#### Autenticación
- Flujos de **Registro** (`/auth/register`) y **Login** (`/auth/login`).
- `AuthProvider` para gestión global de sesión.
- `RequireAuth` para proteger rutas privadas bajo el grupo `/(app)`.

#### 👛 Billeteras (Multi-wallet)
- **WalletProvider**: Gestiona la billetera activa, persiste la selección en `localStorage` y provee el contexto a toda la aplicación.
- **Gestión de Billeteras**:
    - Listado y selección en `/(app)/wallets`.
    - Creación con moneda personalizada en `/(app)/wallets/new`.
    - Edición de propiedades y visualización de `invite_code` en `/(app)/wallets/[id]/edit`.

#### 💳 Transacciones
- **Resumen Mensual**: Navegación fluída entre meses con cálculo automático de ingresos, gastos y balance.
- **Gestión de Movimientos**: 
    - Formulario unificado (`TransactionFormScreen`) para crear, editar y eliminar.
    - **Confirmación mejorada**: Los borrados se gestionan mediante un Modal personalizado en lugar de diálogos nativos.
    - Soporte para categorías y etiquetas múltiples.
    - Listado detallado con indicadores visuales por tipo de movimiento.

#### 🏷️ Etiquetas y Filtros
- Creación de etiquetas *on-the-fly* desde el formulario.
- Filtrado dinámico en la Home mediante chips interactivos.

---

## 🎨 Diseño / UX
- **Enfoque Mobile-first**: Limitación de ancho en desktop (`max-w-md`) para una experiencia consistente.
- **Componentes UI Reutilizables**: Implementación de un sistema de **Modales modernos** con efecto *glassmorphism* (`backdrop-blur`) y variantes de estado (info, danger).
- **Estética Moderna**: Modo oscuro (`bg-slate-950`), transiciones suaves y componentes optimizados.
- **Usabilidad**: Botón de acción flotante (FAB) para acceso rápido a nuevas transacciones.

---

## 🛠️ Instalación y Configuración Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/<TU_USUARIO>/finanzas-app.git
cd finanzas-app
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Variables de entorno
Crea un archivo `.env.local` en la raíz con tus credenciales de Supabase:
```env
NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
```

### 4. Preparar la Base de Datos
1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Ejecuta los scripts SQL de `docs/db-schema.md` en el orden indicado.
3. Crea la **RPC** necesaria para la creación de billeteras:

```sql
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
```

### 5. Iniciar el servidor de desarrollo
```bash
npm run dev
```
Accede a [http://localhost:3000](http://localhost:3000).

### 6. Verificar Build de producción
Antes de desplegar, puedes verificar que todo compile correctamente:
```bash
npm run build
```
O correr el linter para asegurar la calidad del código:
```bash
npm run lint
```

---

## 📁 Estructura del Proyecto
```text
app/             # Rutas y layouts (Next.js App Router)
components/      # Componentes de negocio y Contextos
  ui/            # Componentes de UI genéricos (Modal, etc.)
hooks/           # Lógica reutilizable (Transacciones, Categorías)
lib/             # Clientes de servicios externos (Supabase)
utils/           # Funciones de utilidad (Fechas, Formateo)
docs/            # Documentación técnica y esquemas SQL
```

---

## 🗺️ Roadmap (Próximas fases)
- [ ] **PWA**: Instalabilidad, Service Workers y caching offline.
- [ ] **Billeteras Compartidas (V2)**: Gestión de miembros, invitaciones por link/email.
- [ ] **Analítica Avanzada**: Gráficos de tendencias, presupuestos por categoría y comparativas mensuales.
