import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const BodySchema = z.object({
  email: z.string().email().max(255),
  token: z.string().min(10).max(200),
  tipo: z.enum(['equipo', 'proveedor']),
  empresa_nombre: z.string().min(1).max(200),
  rol: z.string().max(50).optional(),
});

const APP_ORIGIN = Deno.env.get('APP_ORIGIN') ?? 'https://friendly-cloud-hub.lovable.app';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM = Deno.env.get('RESEND_FROM') ?? 'SSTLink <onboarding@resend.dev>';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // verify_jwt = true (default) already enforces auth; require the header to be present.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'email_not_configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { email, token, tipo, empresa_nombre, rol } = parsed.data;

    const path = tipo === 'proveedor' ? 'prov' : 'inv';
    const link = `${APP_ORIGIN}/register?${path}=${encodeURIComponent(token)}`;

    const heading = tipo === 'proveedor'
      ? `${empresa_nombre} te invitó como proveedor en SSTLink`
      : `${empresa_nombre} te invitó a SSTLink${rol ? ` como ${rol}` : ''}`;

    const html = `<!doctype html>
<html><body style="font-family:Arial,sans-serif;background:#F8FAFC;padding:24px;color:#0F172A">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #E2E8F0">
    <h1 style="font-size:20px;margin:0 0 12px;color:#0F172A">${heading}</h1>
    <p style="font-size:14px;line-height:1.5;color:#334155;margin:0 0 20px">
      Haz clic en el botón para crear tu cuenta y unirte:
    </p>
    <p style="margin:0 0 24px">
      <a href="${link}" style="display:inline-block;background:#F97316;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">
        Aceptar invitación
      </a>
    </p>
    <p style="font-size:12px;color:#64748B;margin:0 0 8px">O copia este enlace:</p>
    <p style="font-size:12px;color:#334155;word-break:break-all;margin:0">${link}</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#94A3B8;margin-top:16px">SSTLink · Colombia</p>
</body></html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM,
        to: [email],
        subject: 'Te invitaron a SSTLink',
        html,
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error('resend error', res.status, details);
      return new Response(JSON.stringify({ error: 'email_send_failed', status: res.status, details }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, id: data.id, link }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('send-invitation-email error', e);
    return new Response(JSON.stringify({ error: 'internal_error', message: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
