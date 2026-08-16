-- 1. Crear una función para obtener los IDs de las billeteras del usuario actual
CREATE OR REPLACE FUNCTION get_auth_user_wallets()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wallet_id FROM wallet_members WHERE user_id = auth.uid();
$$;

-- 2. Actualizar política de wallet_members para permitir ver a TODOS los miembros de sus billeteras compartidas
DROP POLICY IF EXISTS "read my wallet memberships" ON wallet_members;
CREATE POLICY "read wallet memberships"
  ON wallet_members
  FOR SELECT
  USING (wallet_id IN (SELECT get_auth_user_wallets()));

-- 3. Actualizar política de profiles para simplificar la lectura de otros perfiles de la misma billetera
DROP POLICY IF EXISTS "read profiles of wallet members" ON profiles;
CREATE POLICY "read profiles of wallet members"
  ON profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    id IN (SELECT user_id FROM wallet_members WHERE wallet_id IN (SELECT get_auth_user_wallets()))
  );;
