
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  SELECT * INTO _inv
  FROM public.invitaciones
  WHERE token = p_token AND estado = 'pendiente'
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitación no válida o ya usada';
  END IF;

  -- Asegurar perfil con la empresa correcta
  UPDATE public.usuarios
    SET empresa_id = _inv.empresa_id,
        rol = _inv.rol
    WHERE COALESCE(auth_user_id, user_id) = _uid;

  -- Asignar rol server-side (nunca confiar en el cliente)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _inv.rol::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  UPDATE public.invitaciones
    SET estado = 'aceptada', accepted_at = now()
    WHERE id = _inv.id;

  RETURN jsonb_build_object('empresa_id', _inv.empresa_id, 'rol', _inv.rol);
END;
$$;

REVOKE ALL ON FUNCTION public.accept_invitation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.change_user_role(target_user_id uuid, new_role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _caller_empresa uuid;
  _target_empresa uuid;
  _target_auth uuid;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'No autenticado';
  END IF;

  -- Solo super_admin o administrador pueden cambiar roles
  IF NOT (public.has_role(_caller, 'super_admin'::public.app_role)
       OR public.has_role(_caller, 'administrador'::public.app_role)) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  _caller_empresa := public.get_user_empresa_id(_caller);
  IF _caller_empresa IS NULL THEN
    RAISE EXCEPTION 'Sin empresa asociada';
  END IF;

  -- target_user_id es el id de public.usuarios
  SELECT empresa_id, COALESCE(auth_user_id, user_id)
    INTO _target_empresa, _target_auth
  FROM public.usuarios
  WHERE id = target_user_id;

  IF _target_auth IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF _target_empresa IS DISTINCT FROM _caller_empresa THEN
    RAISE EXCEPTION 'No autorizado para esta empresa';
  END IF;

  -- Nadie puede degradar al último super_admin de la empresa
  IF new_role <> 'super_admin'::public.app_role AND EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.usuarios u ON COALESCE(u.auth_user_id, u.user_id) = ur.user_id
    WHERE u.id = target_user_id AND ur.role = 'super_admin'::public.app_role
  ) THEN
    IF (SELECT count(*) FROM public.user_roles ur
        JOIN public.usuarios u ON COALESCE(u.auth_user_id, u.user_id) = ur.user_id
        WHERE u.empresa_id = _caller_empresa AND ur.role = 'super_admin'::public.app_role) <= 1 THEN
      RAISE EXCEPTION 'No puedes quitar el último super_admin';
    END IF;
  END IF;

  UPDATE public.usuarios SET rol = new_role::text WHERE id = target_user_id;

  DELETE FROM public.user_roles WHERE user_id = _target_auth;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target_auth, new_role);
END;
$$;

REVOKE ALL ON FUNCTION public.change_user_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.change_user_role(uuid, public.app_role) TO authenticated;
