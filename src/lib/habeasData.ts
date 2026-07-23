import { supabase } from "@/integrations/supabase/client";

export const POLICY_VERSION = "v1-2026-07";
export const POLICY_VIGENCIA = "23 de julio de 2026";

type RegistrarConsentimientoParams = {
  userId?: string | null;
  empresaId?: string | null;
  titularTipo: "usuario" | "trabajador";
  titularId?: string | null;
};

/**
 * Inserta un registro append-only de consentimiento de tratamiento de datos
 * conforme a la Ley 1581 de 2012 (Habeas Data — Colombia).
 * Falla silenciosamente para no bloquear el flujo principal.
 */
export async function registrarConsentimiento({
  userId,
  empresaId,
  titularTipo,
  titularId,
}: RegistrarConsentimientoParams): Promise<void> {
  try {
    const user_agent =
      typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : null;

    await (supabase as any).from("consentimientos_habeas_data").insert({
      user_id: userId ?? null,
      empresa_id: empresaId ?? null,
      titular_tipo: titularTipo,
      titular_id: titularId ?? null,
      version_politica: POLICY_VERSION,
      user_agent,
    });
  } catch {
    // No bloquear el flujo si el registro falla; queda log en logs de Supabase.
  }
}
