import { supabase } from "@/integrations/supabase/client";

// Fallback si la BD no responde. La fuente de verdad es `politicas_privacidad`.
export const POLICY_VERSION_FALLBACK = "v1-2026-07";
export const POLICY_VIGENCIA_FALLBACK = "23 de julio de 2026";

export type PoliticaPrivacidad = {
  version: string;
  vigencia_desde: string; // ISO date
  titulo: string;
};

let _cached: PoliticaPrivacidad | null = null;
let _inflight: Promise<PoliticaPrivacidad> | null = null;

function formatVigencia(iso: string): string {
  try {
    const d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function getVigenciaFormatted(p: PoliticaPrivacidad): string {
  return formatVigencia(p.vigencia_desde);
}

/**
 * Lee la política vigente desde la BD (con cache en memoria).
 * Cae al fallback si no hay conexión.
 */
export async function getActivePolicy(): Promise<PoliticaPrivacidad> {
  if (_cached) return _cached;
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("politicas_privacidad")
        .select("version, vigencia_desde, titulo")
        .eq("activa", true)
        .maybeSingle();

      if (error || !data) throw error ?? new Error("sin política activa");

      _cached = data as PoliticaPrivacidad;
      return _cached;
    } catch {
      _cached = {
        version: POLICY_VERSION_FALLBACK,
        vigencia_desde: "2026-07-23",
        titulo: "Política de Tratamiento de Datos Personales",
      };
      return _cached;
    } finally {
      _inflight = null;
    }
  })();

  return _inflight;
}

type RegistrarConsentimientoParams = {
  userId?: string | null;
  empresaId?: string | null;
  titularTipo: "usuario" | "trabajador";
  titularId?: string | null;
};

/**
 * Inserta un registro append-only de consentimiento de tratamiento de datos
 * conforme a la Ley 1581 de 2012 (Habeas Data — Colombia).
 * Usa la versión de política vigente leída desde la BD.
 * Falla silenciosamente para no bloquear el flujo principal.
 */
export async function registrarConsentimiento({
  userId,
  empresaId,
  titularTipo,
  titularId,
}: RegistrarConsentimientoParams): Promise<void> {
  try {
    const policy = await getActivePolicy();
    const user_agent =
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;

    await (supabase as any).from("consentimientos_habeas_data").insert({
      user_id: userId ?? null,
      empresa_id: empresaId ?? null,
      titular_tipo: titularTipo,
      titular_id: titularId ?? null,
      version_politica: policy.version,
      user_agent,
    });
  } catch {
    // No bloquear el flujo si el registro falla.
  }
}

// Compatibilidad hacia atrás (deprecated) — usar getActivePolicy().
export const POLICY_VERSION = POLICY_VERSION_FALLBACK;
export const POLICY_VIGENCIA = POLICY_VIGENCIA_FALLBACK;
