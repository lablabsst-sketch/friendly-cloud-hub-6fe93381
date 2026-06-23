
ALTER TABLE public.capacitaciones
  ADD COLUMN IF NOT EXISTS modalidad text DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS link_reunion text,
  ADD COLUMN IF NOT EXISTS archivo_url text,
  ADD COLUMN IF NOT EXISTS firma_token uuid DEFAULT gen_random_uuid();

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'capacitaciones_modalidad_check'
  ) THEN
    ALTER TABLE public.capacitaciones
      ADD CONSTRAINT capacitaciones_modalidad_check
      CHECK (modalidad IN ('presencial','virtual','hibrida'));
  END IF;
END $$;

ALTER TABLE public.asistencia_capacitacion
  ADD COLUMN IF NOT EXISTS empleado_contratista_id uuid REFERENCES public.empleados_contratista(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS telefono_whatsapp text;
