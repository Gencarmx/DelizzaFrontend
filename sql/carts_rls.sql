-- ============================================================
-- Configuración de la tabla `carts` para Supabase
-- carts.user_id → auth.users.id (relación directa)
--
-- Ejecuta en SQL Editor de Supabase.
-- ============================================================

-- 1. REPLICA IDENTITY FULL (necesario para Realtime con payload completo)
alter table carts replica identity full;

-- 2. Publicación Realtime para la tabla
--    (si ya lo hiciste desde la UI de Supabase, omite esta línea)
alter publication supabase_realtime add table carts;

-- 3. Row Level Security
alter table carts enable row level security;

create policy "cart_select_own"
  on carts for select
  using (auth.uid() = user_id);

create policy "cart_insert_own"
  on carts for insert
  with check (auth.uid() = user_id);

create policy "cart_update_own"
  on carts for update
  using (auth.uid() = user_id);

create policy "cart_delete_own"
  on carts for delete
  using (auth.uid() = user_id);

-- Verificación opcional:
-- select * from pg_policies where tablename = 'carts';
