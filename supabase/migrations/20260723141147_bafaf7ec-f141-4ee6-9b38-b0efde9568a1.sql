
CREATE TABLE public.politicas_privacidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL UNIQUE,
  vigencia_desde date NOT NULL,
  titulo text NOT NULL DEFAULT 'Política de Tratamiento de Datos Personales',
  activa boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX politicas_privacidad_una_activa
  ON public.politicas_privacidad ((activa)) WHERE activa = true;

GRANT SELECT ON public.politicas_privacidad TO anon, authenticated;
GRANT ALL ON public.politicas_privacidad TO service_role;

ALTER TABLE public.politicas_privacidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Politicas visibles para todos"
  ON public.politicas_privacidad FOR SELECT
  USING (true);

CREATE TRIGGER update_politicas_privacidad_updated_at
  BEFORE UPDATE ON public.politicas_privacidad
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.politicas_privacidad (version, vigencia_desde, activa)
VALUES ('v1-2026-07', '2026-07-23', true);
