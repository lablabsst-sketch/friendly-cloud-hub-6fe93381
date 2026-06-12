import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, FileText, Upload, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

interface Vinculo {
  id: string;
  estado: string;
  created_at: string;
  empresa_solicitante: { id: string; nombre: string; nit: string | null } | null;
}

interface DocEmpresa {
  id: string;
  nombre: string;
  tipo: string | null;
  url: string | null;
  fecha_vencimiento: string | null;
  estado: string;
}

export default function PortalProveedor() {
  const { usuario } = useAuth();
  const empresaId = usuario?.empresa_id ?? null;
  const [loading, setLoading] = useState(true);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [docs, setDocs] = useState<DocEmpresa[]>([]);
  const [uploading, setUploading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (!empresaId) return;
    load();
  }, [empresaId]);

  const load = async () => {
    setLoading(true);
    const [{ data: sols }, { data: docsData }] = await Promise.all([
      supabase
        .from("solicitudes_enlace")
        .select("id, estado, created_at, empresa_solicitante:empresas!solicitudes_enlace_empresa_solicitante_id_fkey(id, nombre, nit)")
        .eq("empresa_proveedor_id", empresaId!)
        .in("estado", ["aceptada", "aprobada"]),
      supabase
        .from("documentos_empresa")
        .select("id, nombre, tipo, url, fecha_vencimiento, estado")
        .eq("empresa_id", empresaId!)
        .order("created_at", { ascending: false }),
    ]);
    setVinculos((sols as unknown as Vinculo[]) ?? []);
    setDocs((docsData as DocEmpresa[]) ?? []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!file || !nombre.trim() || !empresaId) {
      toast.error("Completa nombre y archivo");
      return;
    }
    setUploading(true);
    try {
      const path = `${empresaId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("documentos").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("documentos").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error: insErr } = await supabase.from("documentos_empresa").insert({
        empresa_id: empresaId,
        nombre: nombre.trim(),
        tipo: tipo.trim() || null,
        url: signed?.signedUrl ?? path,
        estado: "vigente",
      });
      if (insErr) throw insErr;
      toast.success("Documento subido");
      setNombre(""); setTipo(""); setFile(null);
      load();
    } catch (e: any) {
      toast.error("No se pudo subir el documento");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-6 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
      </AppLayout>
    );
  }

  if (vinculos.length === 0) {
    return (
      <AppLayout>
        <div className="p-6 max-w-2xl mx-auto">
          <Card className="p-8 text-center space-y-3">
            <Building2 className="w-10 h-10 text-muted-foreground mx-auto" />
            <h2 className="text-lg font-medium text-foreground">Portal del proveedor</h2>
            <p className="text-sm text-muted-foreground">
              Aún no estás vinculado con ninguna empresa en SSTLink.
            </p>
            <p className="text-xs text-muted-foreground">
              Cuando una empresa te agregue como proveedor con tu NIT, podrás verla aquí.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-medium text-foreground">Portal del proveedor</h1>
          <p className="text-sm text-muted-foreground">Empresas que te tienen vinculado como proveedor.</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Empresas contratantes</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {vinculos.map(v => (
              <Card key={v.id} className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{v.empresa_solicitante?.nombre ?? "Empresa"}</p>
                  {v.empresa_solicitante?.nit && (
                    <p className="text-xs text-muted-foreground">NIT: {v.empresa_solicitante.nit}</p>
                  )}
                  <Badge variant="secondary" className="mt-1 text-[10px]">Vinculado</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Mis documentos</h2>
          <Card className="p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs">Nombre</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej. RUT, ARL..." />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Input value={tipo} onChange={e => setTipo(e.target.value)} placeholder="Opcional" />
              </div>
              <div>
                <Label className="text-xs">Archivo</Label>
                <Input type="file" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </div>
            </div>
            <Button onClick={handleUpload} disabled={uploading} size="sm">
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Subir documento
            </Button>
          </Card>

          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Aún no has subido documentos.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {docs.map(d => (
                <Card key={d.id} className="p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.nombre}</p>
                      {d.fecha_vencimiento && (
                        <p className="text-xs text-muted-foreground">Vence: {d.fecha_vencimiento}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={d.estado === "vencido" ? "destructive" : "secondary"} className="text-[10px]">{d.estado}</Badge>
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
