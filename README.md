# Finanzas App 💸

MVP de una aplicación de finanzas personales tipo Spendee, diseñada con un enfoque **mobile-first** y preparada para evolucionar hacia una **PWA**.

## 🚀 Tecnologías Principales
- **Framework:** [Next.js 16.1.6](https://nextjs.org/) (Con optimización de imágenes nativa)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Backend:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + RLS + Storage)
- **IA:** [OpenAI Responses API](https://developers.openai.com/api/docs/guides/function-calling) con GPT-5.6 Luna
- **Lenguaje:** TypeScript (Tipado estricto, sin `any`)
- **Gráficos:** [Recharts](https://recharts.org/)
- **Animaciones:** [Framer Motion](https://www.framer.com/motion/)

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
    - **CRUD de Categorías**: Gestión completa (Crear, Editar, Eliminar) de categorías personalizadas por billetera desde la pantalla de edición.

#### 💳 Transacciones
- **Resumen Mensual**: Navegación fluída entre meses con cálculo automático de ingresos, gastos y balance.
    - **Identificación de Responsable**: Cada movimiento muestra el nombre del usuario que lo registró, ideal para billeteras compartidas.
    - **Filtros e Inteligencia**:
        - Filtros rápidos por Usuario y Etiquetas con chips interactivos.
        - **Totales Dinámicos**: El balance mensual, ingresos y gastos se recalculan automáticamente al aplicar filtros, permitiendo saber cuánto gastó cada persona al instante.
    - Soporte para categorías y etiquetas múltiples.
    - Listado detallado con indicadores visuales por tipo de movimiento.

#### 🏷️ Etiquetas y Filtros
- Creación de etiquetas *on-the-fly* desde el formulario.
- Filtrado dinámico en la Home mediante chips interactivos.

#### 📊 Analítica y Visualización
- **Dashboard Interactivo**: Nueva pantalla dedicada a la visualización de datos financieros.
- **Granularidad Dinámica**: Gráficos de barras que muestran gastos por día (vista mensual) o por mes (vista anual).
- **Filtros Personalizados**: Capacidad de filtrar todos los gráficos por Categoría y Usuario encargado del gasto.
- **Enfoque en Gastos**: Gráficos de barras y tortas optimizados para visualizar exclusivamente egresos, permitiendo un control de presupuesto más estricto.
- **Control de Gastos por Persona**: Visualización clara de cuánto ha gastado cada miembro en billeteras compartidas.
- **UX Optimizada**: Scroll lateral automático para ver los datos más recientes y etiquetas compactas (K/M) para mayor claridad.

#### 🤖 Asistente financiero de consulta
- Chat privado en `/assistant`, limitado a la billetera activa.
- Consultas por día exacto, rangos inclusivos, períodos relativos y comparaciones.
- Herramientas de solo lectura para resúmenes, categorías y búsqueda de movimientos.
- Totales separados por moneda: nunca combina ARS, USD u otras monedas.
- Conversación visible temporal en memoria; no se reconstruye al recargar.
- Telemetría por interacción en Supabase: pregunta, respuesta, tiempos, llamadas al modelo, tokens, costo USD estimado y herramientas, protegida por RLS.
- Autenticación independiente en la API mediante JWT de Supabase y protección RLS.

#### 💘 San Valentín Recap (Seasonal)
- **Instagram-style Stories**: Visualización fluida de momentos especiales con animaciones premium (`framer-motion`).
- **Lógica Inteligente**: Se muestra automáticamente el 14 de febrero a usuarios con billeteras compartidas.
- **Persistencia**: Control de "visto" mediante Supabase para mostrarlo solo una vez por día.
- **Modo Pruebas**: Capacidad de activar el modo debug añadiendo `?valentine=true` a la URL.

#### 📸 Confirmación de Gastos (Emotional UX)
- **Feedback Emocional**: Al guardar un gasto, se muestra una "Recompensa Visual" en lugar de un simple toast.
- **Contenido Dinámico**:
    - **Fotos**: Se obtiene una imagen aleatoria desde el bucket `fotosRodricu/random-moments`.
    - **Frases**: Se selecciona una frase aleatoria del diccionario personal (`phrases.json`).
- **Diseño Inmersivo**: Modal pantalla completa con fondo borroso y texto legible sobre la imagen.

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
Crea un archivo `.env.local` en la raíz. Puedes copiar `.env.example` y completar tus credenciales:
```env
NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_PUBLIC_KEY
OPENAI_API_KEY=TU_CLAVE_PRIVADA_DE_OPENAI
OPENAI_MODEL=gpt-5.6-luna
```

`OPENAI_API_KEY` es exclusivamente de servidor: nunca debe llevar el prefijo `NEXT_PUBLIC_` ni incluirse en commits o logs. El agente no utiliza `SUPABASE_SERVICE_ROLE_KEY`; todas las consultas se ejecutan con el JWT del usuario y respetan RLS.

Las solicitudes a Responses API usan `store: false`, por lo que la aplicación no crea conversaciones persistentes en OpenAI. Esto no implica retención cero: salvo que la organización tenga Zero Data Retention o Modified Abuse Monitoring, OpenAI puede conservar temporalmente datos para monitoreo de abuso según su [política de datos](https://developers.openai.com/api/docs/guides/your-data#default-usage-policies-by-endpoint).

La aplicación sí guarda telemetría propia en `public.interacciones_agente`.
Incluye la pregunta y respuesta completas, por lo que debe tratarse como dato
financiero sensible. No almacena el JWT ni los resultados crudos de las
herramientas. Estas filas sirven para analizar calidad, latencia y consumo; no
son memoria conversacional ni un registro forense a prueba de manipulación.
El costo en USD es una estimación basada en la tarifa versionada guardada con
cada fila; la factura de OpenAI sigue siendo la fuente definitiva.

### 4. Preparar la Base de Datos
1. Crea un proyecto en [Supabase](https://supabase.com/).
2. Ejecuta los scripts SQL de `docs/db-schema.md` en el orden indicado.
3. Aplica las migraciones versionadas de `supabase/migrations`, incluida la
   creación de `interacciones_agente`.
4. Crea la **RPC** necesaria para la creación de billeteras:

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

-- 4. Corregir relación de transacciones con perfiles (para ver nombres)
alter table public.transactions drop constraint if exists transactions_created_by_fkey;
alter table public.transactions add constraint transactions_created_by_fkey 
  foreign key (created_by) references public.profiles(id);
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

Las pruebas unitarias del agente se ejecutan con:
```bash
npm test
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
 
 ## 📱 PWA (Progressive Web App)
 La aplicación está configurada para ser instalable en dispositivos móviles.
 
 ### Estrategia de Despliegue (Build Híbrido)
 Para evitar conflictos de compilación en entornos Windows locales con Next.js 16 (Turbopack), se ha implementado una lógica condicional en `next.config.mjs`:
 - **Windows (Local)**: El plugin PWA se desactiva. `npm run build` funciona sin errores.
 - **Linux (Vercel)**: El plugin PWA se activa automáticamente al detectar el SO, generando los Service Workers necesarios.
 
 ### Cómo instalar en tu celular
 1. Asegúrate de que el despliegue en Vercel haya finalizado.
 2. Abre la URL de tu aplicación en el navegador.
    - **Android (Chrome)**: Toca el menú (3 puntos) -> "Instalar aplicación".
    - **iOS (Safari)**: Toca el botón "Compartir" -> "Agregar a Inicio".
 
 ---

## 🗺️ Roadmap (Próximas fases)
- [x] **PWA**: Instalabilidad y assets configurados (Activación automática en Vercel/Producción).
- [x] **Analítica**: Dashboard interactivo con gráficos comparativos, filtros y desglose por usuario. (Optimizado para Gastos).
- [x] **Optimización UI**: Remoción de etiquetas globales y simplificación de flujos por petición del usuario.
- [ ] **Billeteras Compartidas (V2)**: Gestión de miembros, invitaciones por link/email.

---

## 🤖 Agente y Automatización
Este proyecto utiliza **Antigravity** con un conjunto de "Skills" y "Workflows" personalizados para asegurar la calidad y velocidad de desarrollo.

### 🛠️ Agent Skills (Instaladas localmente)
Hemos dotado al agente de capacidades especializadas en:
- **Supabase & Postgres**: Mejores prácticas en modelado y RLS.
- **Next.js App Router**: Patrones avanzados de arquitectura.
- **E2E Testing**: Estrategias de pruebas robustas.
- **UI & Animations**: Componentes "Premium" basados en Ibelick UI.
- **Edge Functions**: Integraciones seguras con servicios externos.
- **Doc Management**: Control y calidad de documentación.

### 🔄 Workflows Personalizados
Para mantener el repo limpio y funcional, utilizamos el comando:
- **`/safe-commit`**: Ejecuta automáticamente `npm run build`, verifica que la documentación esté al día y solicita confirmación del mensaje de commit antes de subir cambios.
- [x] **Feature San Valentín & Fotos Sorpresa**: Stories de momentos especiales y confirmación emocional tras registrar gastos.
