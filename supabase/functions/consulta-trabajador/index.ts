// Public endpoint to check if a worker is verified for entry.
// Designed to be called by a WhatsApp bot (or any external integration).
// Input:  { documento: string }  OR  ?documento=...
// Output: { encontrado: boolean, ...workerInfo }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require shared secret from the calling bot
    const expected = Deno.env.get("BOT_SHARED_SECRET");
    if (!expected) {
      return jsonResponse({ encontrado: false, error: "Servicio no configurado." }, 500);
    }
    const provided = req.headers.get("x-bot-secret") ?? "";
    if (provided !== expected) {
      return jsonResponse({ encontrado: false, error: "No autorizado." }, 401);
    }

    // Accept documento via JSON body OR query string (easier for bots)
    let documento: string | null = null;
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      documento = (body?.documento ?? "").toString().trim();
    } else {
      const url = new URL(req.url);
      documento = (url.searchParams.get("documento") ?? "").trim();
    }

    if (!documento) {
      return jsonResponse(
        { encontrado: false, error: "Debes enviar el número de documento." },
        400
      );
    }

    // Strip non-digits (people often type "1.234.567" or "CC 1234567")
    const docClean = documento.replace(/\D/g, "");
    if (!docClean) {
      return jsonResponse(
        { encontrado: false, error: "Documento inválido." },
        400
      );
    }

    // Use service role to read across all empresas (this is a public bot)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabase
      .from("trabajadores")
      .select(
        "id, nombres, apellidos, cargo, arl, eps, tipo_documento, numero_documento, verificado_ingreso, verificado_en, eliminado, empresa_id, empresas(nombre)"
      )
      .eq("numero_documento", docClean)
      .eq("eliminado", false)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("DB error:", error);
      return jsonResponse(
        { encontrado: false, error: "Error consultando la base de datos." },
        500
      );
    }

    if (!data) {
      return jsonResponse({
        encontrado: false,
        mensaje:
          "No encontramos un trabajador con ese número de documento. Verifica con tu empresa contratante.",
      });
    }

    const empresa = (data as any).empresas?.nombre ?? null;

    return jsonResponse({
      encontrado: true,
      autorizado: !!data.verificado_ingreso,
      nombre_completo: `${data.nombres} ${data.apellidos}`,
      tipo_documento: data.tipo_documento,
      numero_documento: data.numero_documento,
      cargo: data.cargo,
      arl: data.arl,
      eps: data.eps,
      empresa,
      verificado_en: data.verificado_en,
      mensaje: data.verificado_ingreso
        ? `✅ ${data.nombres} ${data.apellidos} está autorizado para ingreso.`
        : `⚠️ ${data.nombres} ${data.apellidos} aún no ha sido verificado para ingreso.`,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return jsonResponse(
      { encontrado: false, error: "Error inesperado." },
      500
    );
  }
});
