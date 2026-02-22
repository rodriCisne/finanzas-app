# Finanzas Personales – Diseño de Base de Datos (Fase 1)



Este documento describe el diseño de la **base de datos en Supabase** para la aplicación tipo Spendee.



El objetivo de esta fase es:



- Tener un **modelo de datos sólido** desde el día 1.

- Soportar desde ya el concepto de **billeteras / cuentas compartidas** (ej: billetera compartida con tu pareja).

- Tener **seguridad a nivel fila (RLS)** correctamente configurada, para que cada usuario sólo vea lo que le corresponde.



---



## 1. Overview



Tecnologías principales:



- **Supabase**

  - PostgreSQL gestionado.

  - Supabase Auth (usuarios).

  - Row Level Security (RLS) + Policies.

- Este esquema está pensado para ser consumido por un frontend en **Next.js** (no cubierto en este README, se documenta aparte).



### Conceptos clave del modelo



- **Usuario (`auth.users`)**: lo maneja Supabase Auth.

- **Perfil (`profiles`)**: datos adicionales del usuario (moneda por defecto, nombre).

- **Billetera (`wallets`)**: una cuenta donde se registran transacciones (puede ser personal o compartida).

- **Miembros de billetera (`wallet_members`)**: usuarios que tienen acceso a una billetera (owner o member).

- **Categorías (`categories`)**: rubros de gastos/ingresos, definidas por billetera.

- **Etiquetas (`tags`)**: labels adicionales (ej: “Trabajo”, “Vacaciones”), también por billetera.

- **Transacciones (`transactions`)**: gastos/ingresos asociados a una billetera.

- **Relación transacción–etiquetas (`transaction_tags`)**: tabla puente N:N.



---



## 2. Modelo de datos



### 2.1. Tabla `currencies`



Catálogo de monedas soportadas.



```sql

create table if not exists currencies (

  code text primary key,          -- 'ARS', 'USD', 'EUR', etc.

  name text not null,             -- 'Peso argentino'

  symbol text not null,           -- '$', 'US$', '€'

  decimals int not null default 2

);

Seeds iniciales recomendados:



sql

Copiar código

insert into currencies (code, name, symbol, decimals) values

  ('ARS', 'Peso argentino', '$', 2),

  ('USD', 'Dólar estadounidense', 'US$', 2),

  ('EUR', 'Euro', '€', 2)

on conflict (code) do nothing;

2.2. Tabla profiles

Perfil adicional del usuario, 1:1 con auth.users.



sql

Copiar código

create table if not exists profiles (

  id uuid primary key references auth.users(id) on delete cascade,

  full_name text,

  default_currency_code text not null default 'ARS' references currencies(code),

  created_at timestamptz default now()

);

Uso:



Guardar configuraciones por usuario.



Usar default_currency_code para crear su primera billetera.



2.3. Tabla wallets

Representa una billetera o cuenta, que puede ser personal o compartida.



sql

Copiar código

create table wallets (

  id uuid primary key default gen_random_uuid(),

  name text not null,                          -- ej. 'Personal', 'Rodri & Vicu'

  owner_id uuid not null references auth.users(id) on delete cascade,

  default_currency_code text not null references currencies(code),

  created_at timestamptz default now()

);

owner_id: usuario “dueño” de la billetera (el que la crea).



default_currency_code: moneda en la que se muestra por defecto el balance de esa billetera.



2.4. Tabla wallet_members

Asocia usuarios a billeteras (para compartir acceso).



sql

Copiar código

create table wallet_members (

  wallet_id uuid references wallets(id) on delete cascade,

  user_id uuid references auth.users(id) on delete cascade,

  role text not null check (role in ('owner', 'member')),

  created_at timestamptz default now(),

  primary key (wallet_id, user_id)

);



create index idx_wallet_members_user

  on wallet_members(user_id);

role = 'owner': dueño de la billetera.



role = 'member': invitado con acceso (ej. tu pareja).



2.5. Tabla categories

Categorías de gastos/ingresos, específicas de una billetera.



sql

Copiar código

create table categories (

  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id) on delete cascade,

  name text not null,

  type text not null check (type in ('income', 'expense', 'both')),

  color text,

  icon text,

  is_default boolean not null default false,

  created_at timestamptz default now()

);



create index idx_categories_wallet

  on categories(wallet_id);

Ejemplos:



Comida y bebida (expense)



Transporte (expense)



Sueldo (income)



Cada billetera puede tener su propio set de categorías.



2.6. Tabla tags

Etiquetas asociadas a una billetera.



sql

Copiar código

create table tags (

  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id) on delete cascade,

  name text not null,

  color text,

  created_at timestamptz default now(),

  unique (wallet_id, name)

);



create index idx_tags_wallet

  on tags(wallet_id);

Uso típico: Trabajo, Vacaciones, Hogar, Proyecto X, etc.



2.7. Tabla transactions

Gastos e ingresos.



sql

Copiar código

create table transactions (

  id uuid primary key default gen_random_uuid(),

  wallet_id uuid not null references wallets(id) on delete cascade,

  created_by uuid not null references auth.users(id), -- quién registró la transacción

  type text not null check (type in ('income', 'expense')),

  amount numeric(14,2) not null check (amount > 0),

  currency_code text not null references currencies(code),

  category_id uuid references categories(id),

  date date not null,

  note text,

  created_at timestamptz default now(),

  updated_at timestamptz

);



create index idx_transactions_wallet_date

  on transactions(wallet_id, date desc);

Notas:



type indica si es ingreso o gasto; el monto se guarda siempre positivo.



created_by permite saber quién cargó el movimiento en una billetera compartida.



2.8. Tabla transaction_tags

Relación N:N entre transacciones y etiquetas.



sql

Copiar código

create table transaction_tags (

  transaction_id uuid references transactions(id) on delete cascade,

  tag_id uuid references tags(id) on delete cascade,

  primary key (transaction_id, tag_id)

);



create index idx_transaction_tags_transaction

  on transaction_tags(transaction_id);



create index idx_transaction_tags_tag

  on transaction_tags(tag_id);

3. Trigger de creación de usuario: handle_new_user

Cuando se crea un usuario en Supabase Auth (auth.users), se dispara un trigger que:



Crea su registro en profiles.



Crea una billetera “Personal”.



Agrega al usuario como owner de esa billetera.



Crea categorías por defecto para esa billetera.



sql

Copiar código

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists handle_new_user();



create or replace function handle_new_user()

returns trigger

language plpgsql

security definer

as $$

declare

  new_wallet_id uuid;

begin

  -- 1) Perfil

  insert into public.profiles (id, full_name, default_currency_code)

  values (

    new.id,

    new.raw_user_meta_data->>'full_name',

    'ARS'

  );



  -- 2) Billetera personal

  insert into public.wallets (name, owner_id, default_currency_code)

  values ('Personal', new.id, 'ARS')

  returning id into new_wallet_id;



  -- 3) Membresía como owner

  insert into public.wallet_members (wallet_id, user_id, role)

  values (new_wallet_id, new.id, 'owner');



  -- 4) Categorías por defecto de esa billetera

  insert into public.categories (wallet_id, name, type, color, icon, is_default)

  values

    (new_wallet_id, 'Comida y bebida', 'expense', '#f97316', 'food', true),

    (new_wallet_id, 'Transporte', 'expense', '#3b82f6', 'car', true),

    (new_wallet_id, 'Salud', 'expense', '#ef4444', 'health', true),

    (new_wallet_id, 'Entretenimiento', 'expense', '#a855f7', 'entertainment', true),

    (new_wallet_id, 'Sueldo', 'income', '#22c55e', 'salary', true);



  return new;

end;

$$;



create trigger on_auth_user_created

  after insert on auth.users

  for each row execute procedure handle_new_user();

4. Row Level Security (RLS) y Policies

4.1. ¿Qué es RLS?

Row Level Security (RLS) es una funcionalidad de PostgreSQL que permite definir políticas de acceso a nivel de fila.



Cuando RLS está activado en una tabla, ninguna fila es visible por defecto.



Las policies definen:



Quién puede leer (SELECT).



Quién puede insertar (INSERT).



Quién puede actualizar (UPDATE).



Quién puede borrar (DELETE).



Supabase usa RLS como base para su modelo de seguridad. En las policies se puede usar auth.uid() para referirse al usuario autenticado.



4.2. Habilitar RLS

sql

Copiar código

alter table profiles         enable row level security;

alter table wallets          enable row level security;

alter table wallet_members   enable row level security;

alter table categories       enable row level security;

alter table tags             enable row level security;

alter table transactions     enable row level security;

alter table transaction_tags enable row level security;

5. Policies definidas (una por una)

5.1. profiles

Policy: read own profile

sql

Copiar código

create policy "read own profile"

  on profiles

  for select

  using (auth.uid() = id);

¿Qué hace?

Permite que el usuario sólo pueda leer su propio perfil.



Regla: auth.uid() = id → el id del perfil debe coincidir con el id del usuario logueado.



Policy: update own profile

sql

Copiar código

create policy "update own profile"

  on profiles

  for update

  using (auth.uid() = id);

¿Qué hace?

Permite que el usuario sólo pueda actualizar su propio perfil.



Regla: idem: sólo puede modificar el registro cuyo id coincide con auth.uid().



No hay policies de INSERT/DELETE porque los perfiles los gestiona el trigger, no el cliente.



5.2. wallets

Policy: read my wallets

sql

Copiar código

create policy "read my wallets"

  on wallets

  for select

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = wallets.id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite ver sólo las billeteras donde el usuario es miembro.



Regla: existe un registro en wallet_members con:



wallet_id = wallets.id, y



user_id = auth.uid().



Policy: create wallet as owner

sql

Copiar código

create policy "create wallet as owner"

  on wallets

  for insert

  with check (owner_id = auth.uid());

¿Qué hace?

Permite crear billeteras sólo si el owner_id es el usuario actual.



Regla: el owner_id de la billetera insertada debe ser auth.uid().



Policies de UPDATE/DELETE se pueden agregar más adelante cuando implementes UI para renombrar o borrar billeteras.



5.3. wallet_members

Policy: read my wallet memberships

sql

Copiar código

create policy "read my wallet memberships"

  on wallet_members

  for select

  using (user_id = auth.uid());

¿Qué hace?

Permite que un usuario vea únicamente las filas de wallet_members donde él mismo es miembro.



Regla: user_id = auth.uid().



En V1 no se permite insertar/actualizar/borrar wallet_members desde el cliente (lo manejará lógica del servidor en una V2).



5.4. categories

Policy: read categories from my wallets

sql

Copiar código

create policy "read categories from my wallets"

  on categories

  for select

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = categories.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite ver sólo categorías de billeteras donde el usuario es miembro.



Regla: el usuario debe estar en wallet_members para la wallet_id asociada a la categoría.



Policy: insert categories in my wallets

sql

Copiar código

create policy "insert categories in my wallets"

  on categories

  for insert

  with check (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = categories.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite crear categorías sólo en billeteras donde el usuario es miembro.



Regla: el wallet_id de la nueva categoría debe estar entre las billeteras del usuario.



Policy: update categories in my wallets

sql

Copiar código

create policy "update categories in my wallets"

  on categories

  for update

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = categories.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite actualizar categorías sólo si pertenecen a una billetera donde el usuario es miembro.



Policy: delete categories in my wallets

sql

Copiar código

create policy "delete categories in my wallets"

  on categories

  for delete

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = categories.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite borrar categorías sólo en billeteras donde el usuario es miembro.



5.5. tags

Las policies de tags siguen exactamente la misma lógica que categories.



read tags from my wallets

sql

Copiar código

create policy "read tags from my wallets"

  on tags

  for select

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = tags.wallet_id

        and wm.user_id = auth.uid()

    )

  );

insert tags in my wallets

sql

Copiar código

create policy "insert tags in my wallets"

  on tags

  for insert

  with check (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = tags.wallet_id

        and wm.user_id = auth.uid()

    )

  );

update tags in my wallets

sql

Copiar código

create policy "update tags in my wallets"

  on tags

  for update

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = tags.wallet_id

        and wm.user_id = auth.uid()

    )

  );

delete tags in my wallets

sql

Copiar código

create policy "delete tags in my wallets"

  on tags

  for delete

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = tags.wallet_id

        and wm.user_id = auth.uid()

    )

  );

5.6. transactions

read transactions from my wallets

sql

Copiar código

create policy "read transactions from my wallets"

  on transactions

  for select

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = transactions.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite ver sólo las transacciones de billeteras donde el usuario es miembro.



insert transactions in my wallets

sql

Copiar código

create policy "insert transactions in my wallets"

  on transactions

  for insert

  with check (

    auth.uid() = created_by

    and exists (

      select 1 from wallet_members wm

      where wm.wallet_id = transactions.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite crear transacciones sólo si:



el created_by es el usuario actual, y



la transacción pertenece a una billetera donde el usuario es miembro.



update transactions in my wallets

sql

Copiar código

create policy "update transactions in my wallets"

  on transactions

  for update

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = transactions.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite actualizar transacciones dentro de billeteras donde el usuario es miembro.



delete transactions in my wallets

sql

Copiar código

create policy "delete transactions in my wallets"

  on transactions

  for delete

  using (

    exists (

      select 1 from wallet_members wm

      where wm.wallet_id = transactions.wallet_id

        and wm.user_id = auth.uid()

    )

  );

¿Qué hace?

Permite borrar transacciones igualmente sólo dentro de billeteras donde el usuario es miembro.



5.7. transaction_tags

Policies basadas en la billetera de la transacción asociada.



read transaction_tags for my wallets

sql

Copiar código

create policy "read transaction_tags for my wallets"

  on transaction_tags

  for select

  using (

    exists (

      select 1

      from transactions t

      join wallet_members wm

        on wm.wallet_id = t.wallet_id

       and wm.user_id = auth.uid()

      where t.id = transaction_tags.transaction_id

    )

  );

¿Qué hace?

Permite ver relaciones transacción–etiquetas sólo si la transacción pertenece a una billetera del usuario.



insert transaction_tags for my wallets

sql

Copiar código

create policy "insert transaction_tags for my wallets"

  on transaction_tags

  for insert

  with check (

    exists (

      select 1

      from transactions t

      join wallet_members wm

        on wm.wallet_id = t.wallet_id

       and wm.user_id = auth.uid()

      where t.id = transaction_tags.transaction_id

    )

  );

¿Qué hace?

Permite asignar etiquetas sólo a transacciones de billeteras donde el usuario es miembro.



delete transaction_tags for my wallets

sql

Copiar código

create policy "delete transaction_tags for my wallets"

  on transaction_tags

  for delete

  using (

    exists (

      select 1

      from transactions t

      join wallet_members wm

        on wm.wallet_id = t.wallet_id

       and wm.user_id = auth.uid()

      where t.id = transaction_tags.transaction_id

    )

  );

¿Qué hace?

Permite quitar etiquetas sólo sobre transacciones de billeteras donde el usuario es miembro

---

## 6. Módulo San Valentín (Febrero 2026)

Este módulo maneja el contenido dinámico del recap anual y el registro de visualizaciones.

### 6.1. Tabla `valentine_stories`
Contenido de las historias (títulos, frases y rutas de imagen).
```sql
create table if not exists public.valentine_stories (
  id uuid primary key default gen_random_uuid(),
  order_index int2 not null,
  title text not null,
  description text not null,
  image_path text not null, -- ruta en el bucket 'valentine-assets'
  year int2 not null default 2026,
  created_at timestamptz default now()
);

alter table public.valentine_stories enable row level security;

create policy "Anyone can read valentine stories"
  on public.valentine_stories for select
  using (true);
```

### 6.2. Tabla `valentine_impressions`
Controla que el usuario vea el recap una sola vez por periodo.
```sql
create table if not exists public.valentine_impressions (
  user_id uuid references auth.users(id) on delete cascade,
  year int2 not null,
  seen_at timestamptz default now(),
  primary key (user_id, year)
);

alter table public.valentine_impressions enable row level security;

create policy "Users can insert own impression"
  on public.valentine_impressions for insert
  with check (auth.uid() = user_id);

create policy "Users can read own impression"
  on public.valentine_impressions for select
  using (auth.uid() = user_id);
```

### 6.3. Storage Bucket: `valentine-assets`
Bucket de acceso público para las imágenes del recap.
```sql
-- Insertar bucket
insert into storage.buckets (id, name, public)
values ('valentine-assets', 'valentine-assets', true)
on conflict (id) do nothing;

-- Política de lectura pública
create policy "Public Access to Valentine Assets"
  on storage.objects for select
  using ( bucket_id = 'valentine-assets' );
```
