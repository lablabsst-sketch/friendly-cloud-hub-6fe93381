ALTER TABLE public.capacitaciones ADD COLUMN IF NOT EXISTS fecha_cierre date;
ALTER TABLE public.asistencia_capacitacion ADD COLUMN IF NOT EXISTS firma_url text;
ALTER TABLE public.asistencia_capacitacion ADD COLUMN IF NOT EXISTS firmado_en timestamptz;
ALTER TABLE public.asistencia_capacitacion ADD COLUMN IF NOT EXISTS fecha_asistencia timestamptz;