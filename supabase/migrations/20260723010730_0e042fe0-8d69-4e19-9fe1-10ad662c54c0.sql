
CREATE TABLE public.consentimientos_habeas_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE SET NULL,
  titular_tipo text NOT NULL CHECK (titular_tipo IN ('usuario','trabajador')),
  titular_id uuid,
  version_politica text NOT NULL,
  aceptado_en timestamptz NOT NULL DEFAULT now(),
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_chd_titular ON public.consentimientos_habeas_data (titular_tipo, titular_id);
CREATE INDEX idx_chd_empresa ON public.consentimientos_habeas_data (empresa_id);
CREATE INDEX idx_chd_user ON public.consentimientos_habeas_data (user_id);

GRANT SELECT, INSERT ON public.consentimientos_habeas_data TO authenticated;
GRANT ALL ON public.consentimientos_habeas_data TO service_role;

ALTER TABLE public.consentimientos_habeas_data ENABLE ROW LEVEL SECURITY;

-- Append-only: bloquear UPDATE y DELETE
CREATE OR REPLACE FUNCTION public.block_consentimiento_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Los consentimientos son append-only: no se pueden modificar ni eliminar';
END;
$$;

CREATE TRIGGER trg_block_chd_update
BEFORE UPDATE ON public.consentimientos_habeas_data
FOR EACH ROW EXECUTE FUNCTION public.block_consentimiento_mutation();

CREATE TRIGGER trg_block_chd_delete
BEFORE DELETE ON public.consentimientos_habeas_data
FOR EACH ROW EXECUTE FUNCTION public.block_consentimiento_mutation();

-- Policies
-- Titular usuario ve los suyos
CREATE POLICY "Titular usuario ve sus consentimientos"
ON public.consentimientos_habeas_data FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins ven los de su empresa
CREATE POLICY "Admin ve consentimientos de su empresa"
ON public.consentimientos_habeas_data FOR SELECT
TO authenticated
USING (
  empresa_id IS NOT NULL
  AND empresa_id = public.get_user_empresa_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'administrador'::public.app_role)
    OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  )
);

-- INSERT: el propio titular autenticado registra su consentimiento
-- Para titular_tipo='usuario': user_id debe ser auth.uid()
-- Para titular_tipo='trabajador': debe pertenecer a la empresa del caller
CREATE POLICY "Titular registra su consentimiento"
ON public.consentimientos_habeas_data FOR INSERT
TO authenticated
WITH CHECK (
  (
    titular_tipo = 'usuario'
    AND user_id = auth.uid()
  )
  OR (
    titular_tipo = 'trabajador'
    AND empresa_id = public.get_user_empresa_id(auth.uid())
  )
);
