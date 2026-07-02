// Public endpoint for anonymous signature uploads.
// Validates firma_token against asistencia_capacitacion before uploading via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { firma_token, dataURL } = await req.json();
    if (typeof firma_token !== "string" || !firma_token) return json({ error: "firma_token requerido" }, 400);
    if (typeof dataURL !== "string" || !dataURL.startsWith("data:image/png;base64,")) {
      return json({ error: "dataURL inválido" }, 400);
    }
    // Cap size ~500KB (base64 length ≈ 4/3 * bytes)
    if (dataURL.length > 700_000) return json({ error: "Firma demasiado grande" }, 413);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Verify token
    const { data: asistencia, error: aErr } = await supabase
      .from("asistencia_capacitacion")
      .select("id, firma_url, firma_token")
      .eq("firma_token", firma_token)
      .maybeSingle();

    if (aErr) return json({ error: "Error validando token" }, 500);
    if (!asistencia) return json({ error: "Token inválido" }, 404);
    if (asistencia.firma_url) return json({ error: "Ya firmado" }, 409);

    // Decode base64 PNG
    const b64 = dataURL.split(",", 2)[1] ?? "";
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    const filename = `${asistencia.id}_${Date.now()}.png`;
    const { error: upErr } = await supabase.storage
      .from("firmas")
      .upload(filename, bin, { contentType: "image/png", upsert: false });
    if (upErr) return json({ error: "Error subiendo firma" }, 500);

    const { data: signed } = await supabase.storage
      .from("firmas")
      .createSignedUrl(filename, 60 * 60 * 24 * 365 * 10);

    const { error: updErr } = await supabase
      .from("asistencia_capacitacion")
      .update({
        firma_url: signed?.signedUrl ?? filename,
        firmado_en: new Date().toISOString(),
        asistio: true,
      })
      .eq("id", asistencia.id);
    if (updErr) return json({ error: "Error registrando firma" }, 500);

    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "Error inesperado" }, 500);
  }
});
