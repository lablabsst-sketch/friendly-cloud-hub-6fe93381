
-- 1. Column-level revoke: clientes_portal.token_acceso
REVOKE SELECT (token_acceso) ON public.clientes_portal FROM authenticated, anon;

-- 2. Column-level revoke: invitaciones.token
REVOKE SELECT (token) ON public.invitaciones FROM authenticated, anon;

-- 3. user_roles: scope admin policy to same empresa
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;

CREATE POLICY "Admins manage roles same empresa - select"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.usuarios u_target
      WHERE COALESCE(u_target.auth_user_id, u_target.user_id) = user_roles.user_id
        AND u_target.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

CREATE POLICY "Admins manage roles same empresa - insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.usuarios u_target
      WHERE COALESCE(u_target.auth_user_id, u_target.user_id) = user_roles.user_id
        AND u_target.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

CREATE POLICY "Admins manage roles same empresa - update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.usuarios u_target
      WHERE COALESCE(u_target.auth_user_id, u_target.user_id) = user_roles.user_id
        AND u_target.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.usuarios u_target
      WHERE COALESCE(u_target.auth_user_id, u_target.user_id) = user_roles.user_id
        AND u_target.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

CREATE POLICY "Admins manage roles same empresa - delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.usuarios u_target
      WHERE COALESCE(u_target.auth_user_id, u_target.user_id) = user_roles.user_id
        AND u_target.empresa_id = public.get_user_empresa_id(auth.uid())
    )
  );

-- 4. Storage: inspecciones bucket UPDATE policy
CREATE POLICY "inspecciones_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'inspecciones'
    AND (storage.foldername(name))[1] = (public.get_user_empresa_id(auth.uid()))::text
  )
  WITH CHECK (
    bucket_id = 'inspecciones'
    AND (storage.foldername(name))[1] = (public.get_user_empresa_id(auth.uid()))::text
  );

-- 5. Revoke EXECUTE on internal helper SECURITY DEFINER functions from anon/authenticated.
-- These are only used inside RLS policies / other SECURITY DEFINER functions.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_empresa_id(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_assign_initial_role(uuid, public.app_role) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_create_empresa(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.find_empresa_by_nit(text) FROM anon, PUBLIC;
