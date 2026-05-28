CREATE UNIQUE INDEX IF NOT EXISTS uniq_trabajador_doc_por_empresa
ON public.trabajadores (empresa_id, tipo_documento, numero_documento)
WHERE eliminado = false;