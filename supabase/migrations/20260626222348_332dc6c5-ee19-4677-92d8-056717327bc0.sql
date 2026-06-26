
-- ============================================================
-- 1) FIRMAS bucket: restrict anon SELECT/INSERT
-- ============================================================
DROP POLICY IF EXISTS "firmas anon insert" ON storage.objects;
DROP POLICY IF EXISTS "firmas public read" ON storage.objects;
DROP POLICY IF EXISTS "firmas authenticated delete" ON storage.objects;

-- Helper: extract asistencia_id from filename pattern "<uuid>_<timestamp>.png"
CREATE OR REPLACE FUNCTION public.firma_asistencia_id_from_name(p_name text)
RETURNS uuid
LANGUAGE sql IMMUTABLE
SET search_path = public, pg_catalog
AS $$
  SELECT CASE
    WHEN p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_'
    THEN (split_part(p_name, '_', 1))::uuid
    ELSE NULL
  END
$$;
REVOKE ALL ON FUNCTION public.firma_asistencia_id_from_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.firma_asistencia_id_from_name(text) TO anon, authenticated, service_role;

CREATE POLICY "firmas insert by valid asistencia"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (
  bucket_id = 'firmas'
  AND EXISTS (
    SELECT 1 FROM public.asistencia_capacitacion ac
    WHERE ac.id = public.firma_asistencia_id_from_name(name)
  )
);

CREATE POLICY "firmas select by valid asistencia"
ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'firmas'
  AND EXISTS (
    SELECT 1 FROM public.asistencia_capacitacion ac
    WHERE ac.id = public.firma_asistencia_id_from_name(name)
  )
);

CREATE POLICY "firmas update by valid asistencia"
ON storage.objects FOR UPDATE TO anon, authenticated
USING (
  bucket_id = 'firmas'
  AND EXISTS (
    SELECT 1 FROM public.asistencia_capacitacion ac
    WHERE ac.id = public.firma_asistencia_id_from_name(name)
  )
)
WITH CHECK (
  bucket_id = 'firmas'
  AND EXISTS (
    SELECT 1 FROM public.asistencia_capacitacion ac
    WHERE ac.id = public.firma_asistencia_id_from_name(name)
  )
);

CREATE POLICY "firmas delete by owner empresa"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'firmas'
  AND EXISTS (
    SELECT 1
    FROM public.asistencia_capacitacion ac
    WHERE ac.id = public.firma_asistencia_id_from_name(storage.objects.name)
      AND ac.empresa_id = public.get_user_empresa_id(auth.uid())
  )
);

-- ============================================================
-- 2) DOCUMENTOS bucket: add missing UPDATE policy
-- ============================================================
DROP POLICY IF EXISTS "documentos_update" ON storage.objects;
CREATE POLICY "documentos_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'documentos'
  AND (storage.foldername(name))[1] = public.get_user_empresa_id(auth.uid())::text
);

-- ============================================================
-- 3) INVITACIONES: kill anon SELECT, kill USING(true) UPDATE
-- ============================================================
DROP POLICY IF EXISTS invitaciones_select_anon ON public.invitaciones;
DROP POLICY IF EXISTS invitaciones_accept ON public.invitaciones;

CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE(rol text, estado text, empresa_nombre text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT i.rol, i.estado, e.nombre
  FROM public.invitaciones i
  JOIN public.empresas e ON e.id = i.empresa_id
  WHERE i.token = p_token
    AND i.estado = 'pendiente'
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_invitation_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(text) TO anon, authenticated;

-- ============================================================
-- 4) PROVEEDORES: token RPCs replace anon SELECT
-- ============================================================
DROP POLICY IF EXISTS proveedores_anon_by_token ON public.proveedores;

CREATE OR REPLACE FUNCTION public.get_proveedor_by_token(p_token text)
RETURNS TABLE(nombre text, nit text, email text, empresa_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT p.nombre, p.nit, p.email, p.empresa_id
  FROM public.proveedores p
  WHERE p.invite_token = p_token
    AND p.invite_token IS NOT NULL
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_proveedor_by_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_proveedor_by_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.link_proveedor_to_empresa_by_token(p_token text, p_empresa_proveedor_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  _uid uuid := auth.uid();
  _user_empresa uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  _user_empresa := public.get_user_empresa_id(_uid);
  IF _user_empresa IS DISTINCT FROM p_empresa_proveedor_id THEN
    RAISE EXCEPTION 'No autorizado para esta empresa';
  END IF;

  UPDATE public.proveedores
    SET empresa_proveedor_id = p_empresa_proveedor_id,
        invite_token = NULL
  WHERE invite_token = p_token
    AND invite_token IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.link_proveedor_to_empresa_by_token(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_proveedor_to_empresa_by_token(text, uuid) TO authenticated;

-- ============================================================
-- 5) TRABAJADORES: drop broken anon policy
-- ============================================================
DROP POLICY IF EXISTS anon_select_trabajadores_portal ON public.trabajadores;

-- ============================================================
-- 6) Fix mutable search_path on existing functions
-- ============================================================
ALTER FUNCTION public.check_proveedores_on_empresa_upsert() SET search_path = public, pg_catalog;
ALTER FUNCTION public.find_empresa_by_nit(text)             SET search_path = public, pg_catalog;
ALTER FUNCTION public.accept_solicitud_enlace(uuid)         SET search_path = public, pg_catalog;
ALTER FUNCTION public.fn_match_proveedores_on_empresa()     SET search_path = public, pg_catalog;
ALTER FUNCTION public.get_portal_cliente(text, uuid)        SET search_path = public, pg_catalog;
ALTER FUNCTION public.normalize_nit(text)                   SET search_path = public, pg_catalog;

-- ============================================================
-- 7) Restrict EXECUTE on SECURITY DEFINER helpers
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_user_empresa_id(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_empresa_id(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_create_empresa(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_create_empresa(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.can_assign_initial_role(uuid, public.app_role) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.can_assign_initial_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.change_user_role(uuid, public.app_role) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.change_user_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.accept_solicitud_enlace(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_solicitud_enlace(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.find_empresa_by_nit(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.find_empresa_by_nit(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_cumplimiento_phva(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_cumplimiento_phva(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_portal_cliente(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_portal_cliente(text) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_portal_cliente(text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_portal_cliente(text, uuid) TO anon, authenticated;
