CREATE TABLE public.evaluacion_preguntas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capacitacion_id uuid NOT NULL REFERENCES public.capacitaciones(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  orden int NOT NULL DEFAULT 0,
  enunciado text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('si_no','multiple')),
  opciones jsonb,
  respuesta_correcta text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_eval_preg_cap ON public.evaluacion_preguntas (capacitacion_id, orden);
CREATE INDEX idx_eval_preg_empresa ON public.evaluacion_preguntas (empresa_id);

CREATE TABLE public.evaluacion_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capacitacion_id uuid NOT NULL REFERENCES public.capacitaciones(id) ON DELETE CASCADE,
  asistencia_id uuid NOT NULL REFERENCES public.asistencia_capacitacion(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  numero_intento int NOT NULL CHECK (numero_intento BETWEEN 1 AND 2),
  puntaje numeric NOT NULL,
  total_preguntas int NOT NULL,
  correctas int NOT NULL,
  respuestas jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asistencia_id, numero_intento)
);
CREATE INDEX idx_eval_int_cap ON public.evaluacion_intentos (capacitacion_id);
CREATE INDEX idx_eval_int_asistencia ON public.evaluacion_intentos (asistencia_id);
CREATE INDEX idx_eval_int_empresa ON public.evaluacion_intentos (empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluacion_preguntas TO authenticated;
GRANT SELECT ON public.evaluacion_intentos TO authenticated;
GRANT ALL ON public.evaluacion_preguntas TO service_role;
GRANT ALL ON public.evaluacion_intentos TO service_role;

ALTER TABLE public.evaluacion_preguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluacion_intentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa ve preguntas de sus capacitaciones"
ON public.evaluacion_preguntas FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa crea preguntas de sus capacitaciones"
ON public.evaluacion_preguntas FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa edita preguntas de sus capacitaciones"
ON public.evaluacion_preguntas FOR UPDATE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()))
WITH CHECK (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa elimina preguntas de sus capacitaciones"
ON public.evaluacion_preguntas FOR DELETE TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa ve intentos de sus capacitaciones"
ON public.evaluacion_intentos FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE OR REPLACE FUNCTION public.touch_evaluacion_pregunta()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_touch_eval_pregunta
BEFORE UPDATE ON public.evaluacion_preguntas
FOR EACH ROW EXECUTE FUNCTION public.touch_evaluacion_pregunta();

CREATE OR REPLACE FUNCTION public.get_evaluacion_by_firma_token(p_firma_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  _asis      public.asistencia_capacitacion%ROWTYPE;
  _cap       public.capacitaciones%ROWTYPE;
  _preguntas jsonb;
  _intentos  int;
  _mejor     numeric;
  _cerrada   boolean;
BEGIN
  SELECT * INTO _asis FROM public.asistencia_capacitacion
  WHERE firma_token = p_firma_token LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO _cap FROM public.capacitaciones WHERE id = _asis.capacitacion_id;
  _cerrada := (_cap.fecha_cierre IS NOT NULL AND _cap.fecha_cierre < CURRENT_DATE);
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object('id', p.id, 'orden', p.orden, 'enunciado', p.enunciado,
                       'tipo', p.tipo, 'opciones', p.opciones)
    ORDER BY p.orden, p.created_at), '[]'::jsonb)
  INTO _preguntas
  FROM public.evaluacion_preguntas p
  WHERE p.capacitacion_id = _asis.capacitacion_id;
  SELECT COUNT(*), MAX(puntaje) INTO _intentos, _mejor
  FROM public.evaluacion_intentos WHERE asistencia_id = _asis.id;
  RETURN jsonb_build_object(
    'tiene_evaluacion', jsonb_array_length(_preguntas) > 0,
    'preguntas', _preguntas,
    'intentos_usados', _intentos,
    'max_intentos', 2,
    'mejor_puntaje', _mejor,
    'cerrada', _cerrada
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_evaluacion_by_firma_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_evaluacion_by_firma_token(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.registrar_intento_evaluacion(
  p_firma_token text, p_respuestas jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_catalog AS $$
DECLARE
  _asis      public.asistencia_capacitacion%ROWTYPE;
  _cap       public.capacitaciones%ROWTYPE;
  _intentos  int;
  _num       int;
  _total     int := 0;
  _correctas int := 0;
  _puntaje   numeric;
  _mejor     numeric;
  _detalle   jsonb := '[]'::jsonb;
  _preg      RECORD;
  _resp      text;
  _ok        boolean;
BEGIN
  SELECT * INTO _asis FROM public.asistencia_capacitacion
  WHERE firma_token = p_firma_token LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enlace no válido'; END IF;
  SELECT * INTO _cap FROM public.capacitaciones WHERE id = _asis.capacitacion_id;
  IF _cap.fecha_cierre IS NOT NULL AND _cap.fecha_cierre < CURRENT_DATE THEN
    RAISE EXCEPTION 'La capacitación está cerrada';
  END IF;
  SELECT COUNT(*) INTO _intentos FROM public.evaluacion_intentos WHERE asistencia_id = _asis.id;
  IF _intentos >= 2 THEN RAISE EXCEPTION 'Máximo de intentos alcanzado'; END IF;
  _num := _intentos + 1;
  FOR _preg IN
    SELECT id, tipo, respuesta_correcta FROM public.evaluacion_preguntas
    WHERE capacitacion_id = _asis.capacitacion_id
  LOOP
    _total := _total + 1;
    _resp := NULL;
    SELECT trim(lower(elem ->> 'respuesta')) INTO _resp
    FROM jsonb_array_elements(p_respuestas) elem
    WHERE (elem ->> 'pregunta_id') = _preg.id::text LIMIT 1;
    _ok := (_resp IS NOT NULL AND _resp = trim(lower(_preg.respuesta_correcta)));
    IF _ok THEN _correctas := _correctas + 1; END IF;
    _detalle := _detalle || jsonb_build_object(
      'pregunta_id', _preg.id, 'respuesta', _resp, 'correcta', _ok);
  END LOOP;
  IF _total = 0 THEN RAISE EXCEPTION 'La evaluación no tiene preguntas'; END IF;
  _puntaje := round((_correctas::numeric / _total::numeric) * 100, 0);
  INSERT INTO public.evaluacion_intentos (
    capacitacion_id, asistencia_id, empresa_id,
    numero_intento, puntaje, total_preguntas, correctas, respuestas
  ) VALUES (
    _asis.capacitacion_id, _asis.id, _asis.empresa_id,
    _num, _puntaje, _total, _correctas, _detalle
  );
  SELECT MAX(puntaje) INTO _mejor FROM public.evaluacion_intentos WHERE asistencia_id = _asis.id;
  RETURN jsonb_build_object(
    'puntaje', _puntaje, 'correctas', _correctas, 'total', _total,
    'numero_intento', _num, 'intentos_restantes', 2 - _num, 'mejor_puntaje', _mejor
  );
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_intento_evaluacion(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registrar_intento_evaluacion(text, jsonb) TO anon, authenticated;