-- 1) Eliminar duplicados manteniendo el id más antiguo por código
DELETE FROM public.phva_estandares a
USING public.phva_estandares b
WHERE a.codigo = b.codigo
  AND a.ctid > b.ctid;

-- 2) Evitar duplicados futuros
ALTER TABLE public.phva_estandares
  ADD CONSTRAINT phva_estandares_codigo_unique UNIQUE (codigo);

-- 3) Reescribir la función de cumplimiento con puntaje ponderado
CREATE OR REPLACE FUNCTION public.get_cumplimiento_phva(p_empresa_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _nivel text;
  _result jsonb;
  _fases jsonb;
  _puntos_total numeric;
  _puntos_obtenidos numeric;
  _total int;
  _completados int;
BEGIN
  SELECT nivel INTO _nivel FROM empresa_estandares WHERE empresa_id = p_empresa_id;
  IF _nivel IS NULL THEN _nivel := '21'; END IF;

  WITH filtered AS (
    SELECT pe.id, pe.fase, pe.codigo, pe.puntaje,
      COALESCE(de.estado, 'sin_iniciar') as estado,
      CASE COALESCE(de.estado, 'sin_iniciar')
        WHEN 'completado' THEN pe.puntaje
        WHEN 'en_progreso' THEN pe.puntaje * 0.5
        ELSE 0
      END AS puntos_obtenidos
    FROM phva_estandares pe
    LEFT JOIN docs_estandar de ON de.estandar_id = pe.id AND de.empresa_id = p_empresa_id
    WHERE
      CASE _nivel
        WHEN '7' THEN pe.aplica_7
        WHEN '21' THEN pe.aplica_21
        WHEN '60' THEN pe.aplica_60
        ELSE true
      END
  ),
  por_fase AS (
    SELECT fase,
      count(*) as total,
      count(*) FILTER (WHERE estado = 'completado') as completados,
      count(*) FILTER (WHERE estado = 'en_progreso') as en_progreso,
      COALESCE(SUM(puntaje), 0) as puntos_total,
      COALESCE(SUM(puntos_obtenidos), 0) as puntos_obtenidos
    FROM filtered
    GROUP BY fase
  )
  SELECT jsonb_agg(jsonb_build_object(
    'fase', fase,
    'total', total,
    'completados', completados,
    'en_progreso', en_progreso,
    'puntos_total', puntos_total,
    'puntos_obtenidos', puntos_obtenidos,
    'porcentaje', CASE WHEN puntos_total > 0
      THEN round((puntos_obtenidos / puntos_total) * 100)
      ELSE 0 END
  ))
  INTO _fases
  FROM por_fase;

  SELECT
    count(*),
    count(*) FILTER (WHERE estado = 'completado'),
    COALESCE(SUM(puntaje), 0),
    COALESCE(SUM(puntos_obtenidos), 0)
  INTO _total, _completados, _puntos_total, _puntos_obtenidos
  FROM (
    SELECT pe.puntaje,
      COALESCE(de.estado, 'sin_iniciar') as estado,
      CASE COALESCE(de.estado, 'sin_iniciar')
        WHEN 'completado' THEN pe.puntaje
        WHEN 'en_progreso' THEN pe.puntaje * 0.5
        ELSE 0
      END AS puntos_obtenidos
    FROM phva_estandares pe
    LEFT JOIN docs_estandar de ON de.estandar_id = pe.id AND de.empresa_id = p_empresa_id
    WHERE CASE _nivel
      WHEN '7' THEN pe.aplica_7
      WHEN '21' THEN pe.aplica_21
      WHEN '60' THEN pe.aplica_60
      ELSE true
    END
  ) sub;

  _result := jsonb_build_object(
    'porcentaje', CASE WHEN _puntos_total > 0
      THEN round((_puntos_obtenidos / _puntos_total) * 100)
      ELSE 0 END,
    'total', _total,
    'completados', _completados,
    'puntos_total', _puntos_total,
    'puntos_obtenidos', _puntos_obtenidos,
    'nivel', _nivel,
    'fases', COALESCE(_fases, '[]'::jsonb)
  );

  RETURN _result;
END;
$function$;