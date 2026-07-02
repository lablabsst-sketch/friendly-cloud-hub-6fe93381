
-- 1) STORAGE firmas — replace anon policies with authenticated + ownership
DROP POLICY IF EXISTS "firmas insert by valid asistencia" ON storage.objects;
DROP POLICY IF EXISTS "firmas update by valid asistencia" ON storage.objects;
DROP POLICY IF EXISTS "firmas select by valid asistencia" ON storage.objects;

CREATE POLICY "firmas select by owner empresa"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'firmas' AND EXISTS (
  SELECT 1 FROM public.asistencia_capacitacion ac
  WHERE ac.id = public.firma_asistencia_id_from_name(objects.name)
    AND ac.empresa_id = public.get_user_empresa_id(auth.uid())));

CREATE POLICY "firmas insert by owner empresa"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'firmas' AND EXISTS (
  SELECT 1 FROM public.asistencia_capacitacion ac
  WHERE ac.id = public.firma_asistencia_id_from_name(objects.name)
    AND ac.empresa_id = public.get_user_empresa_id(auth.uid())));

CREATE POLICY "firmas update by owner empresa"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'firmas' AND EXISTS (
  SELECT 1 FROM public.asistencia_capacitacion ac
  WHERE ac.id = public.firma_asistencia_id_from_name(objects.name)
    AND ac.empresa_id = public.get_user_empresa_id(auth.uid())));

-- 2) Drop legacy anon policies (may already be gone)
DROP POLICY IF EXISTS "anon_select_empresas_portal" ON public.empresas;
DROP POLICY IF EXISTS "anon_select_clientes_portal" ON public.clientes_portal;
DROP POLICY IF EXISTS "anon_select_trab_cliente" ON public.trabajadores_cliente;
DROP POLICY IF EXISTS "anon_select_docs_emp_cliente" ON public.docs_empresa_cliente;
DROP POLICY IF EXISTS "anon_select_docs_empresa_portal" ON public.documentos_empresa;
DROP POLICY IF EXISTS "anon_select_docs_trab_portal" ON public.documentos_trabajador;

-- 3) empresas admin restrict to own company
DROP POLICY IF EXISTS "Admins can manage empresas" ON public.empresas;
CREATE POLICY "Admins can manage own empresa"
ON public.empresas FOR ALL TO authenticated
USING (id = public.get_user_empresa_id(auth.uid())
  AND (public.has_role(auth.uid(), 'super_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'administrador'::public.app_role)))
WITH CHECK (id = public.get_user_empresa_id(auth.uid())
  AND (public.has_role(auth.uid(), 'super_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'administrador'::public.app_role)));

-- 4) Column-level protection for token columns
REVOKE SELECT (token) ON public.invitaciones FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, empresa_id, email, rol, estado, created_by, created_at, accepted_at) ON public.invitaciones TO authenticated;

REVOKE SELECT (token_acceso) ON public.clientes_portal FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, empresa_id, nombre, nit_cedula, tipo, contacto, email, telefono, activo, notas, created_at, updated_at)
  ON public.clientes_portal TO authenticated;

REVOKE SELECT (invite_token) ON public.proveedores FROM PUBLIC, anon, authenticated;
GRANT SELECT (id, empresa_id, empresa_proveedor_id, nombre, nit, tipo_servicio, representante, email, telefono,
              ciudad, departamento, arl, fecha_inicio_contrato, fecha_fin_contrato, estado, notas, created_at, updated_at)
  ON public.proveedores TO authenticated;

-- 5) Admin RPCs for token retrieval
CREATE OR REPLACE FUNCTION public.get_pending_invitations_with_token(p_empresa_id uuid)
RETURNS TABLE(id uuid, email text, rol text, token text, estado text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF public.get_user_empresa_id(auth.uid()) IS DISTINCT FROM p_empresa_id THEN
    RAISE EXCEPTION 'No autorizado'; END IF;
  IF NOT (public.has_role(auth.uid(), 'super_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'administrador'::public.app_role)) THEN
    RAISE EXCEPTION 'No autorizado'; END IF;
  RETURN QUERY
  SELECT i.id, i.email, i.rol, i.token, i.estado, i.created_at
  FROM public.invitaciones i
  WHERE i.empresa_id = p_empresa_id AND i.estado = 'pendiente'
  ORDER BY i.created_at DESC;
END; $$;

CREATE OR REPLACE FUNCTION public.create_invitation_and_get_token(p_email text, p_rol text)
RETURNS TABLE(id uuid, token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _empresa uuid := public.get_user_empresa_id(auth.uid()); _id uuid; _token text;
BEGIN
  IF auth.uid() IS NULL OR _empresa IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  IF NOT (public.has_role(auth.uid(), 'super_admin'::public.app_role)
       OR public.has_role(auth.uid(), 'administrador'::public.app_role)) THEN
    RAISE EXCEPTION 'No autorizado'; END IF;
  INSERT INTO public.invitaciones (empresa_id, email, rol)
  VALUES (_empresa, lower(trim(p_email)), p_rol)
  RETURNING invitaciones.id, invitaciones.token INTO _id, _token;
  RETURN QUERY SELECT _id, _token;
END; $$;

-- 6) Function EXECUTE lockdown
REVOKE EXECUTE ON FUNCTION public.accept_invitation(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.accept_solicitud_enlace(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.change_user_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_create_empresa(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_assign_initial_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_cumplimiento_phva(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.link_proveedor_to_empresa_by_token(text, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_pending_invitations_with_token(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_invitation_and_get_token(text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_solicitud_enlace(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_user_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_empresa(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_assign_initial_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cumplimiento_phva(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_proveedor_to_empresa_by_token(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_invitations_with_token(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_invitation_and_get_token(text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_proveedores_on_empresa_upsert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_match_proveedores_on_empresa() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_verificacion_change() FROM PUBLIC, anon, authenticated;
