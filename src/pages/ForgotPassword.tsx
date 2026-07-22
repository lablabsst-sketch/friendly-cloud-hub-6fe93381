import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import logoSstlink from "@/assets/logo-sstlink.png";
import { z } from "zod";

const schema = z.object({ email: z.string().trim().email("Correo inválido").max(255) });

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      setErr(parsed.error.errors[0]?.message ?? "Correo inválido");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: any) {
      toast({ title: "No se pudo enviar", description: e.message ?? "Intenta nuevamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src={logoSstlink} alt="SSTLink" className="h-10 w-auto" />
        </div>
        <div className="bg-card rounded-xl border-[0.5px] border-border p-6">
          <h1 className="text-lg font-medium text-foreground mb-1">Recuperar contraseña</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Te enviaremos un enlace para restablecer tu contraseña.
          </p>

          {sent ? (
            <div className="space-y-4">
              <p className="text-sm text-foreground">
                Te enviamos un link para restablecer tu contraseña. Revisa tu bandeja de entrada.
              </p>
              <Link to="/login" className="block text-sm text-primary hover:underline">
                Volver a iniciar sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  aria-invalid={!!err}
                />
                {err && <p role="alert" className="text-xs text-destructive">{err}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
              <Link to="/login" className="block text-xs text-center text-muted-foreground hover:text-primary">
                Volver a iniciar sesión
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
