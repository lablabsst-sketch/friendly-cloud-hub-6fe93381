import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Search, FileText, Download, ArrowLeft, User, Loader2 } from "lucide-react";
import logoSstlink from "@/assets/logo-sstlink.png";

interface PortalTrabajador {
  id: string;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  tipo_documento: string;
  numero_documento: string;
  arl: string | null;
  eps: string | null;
  estado: string;
  documentos: { id: string; nombre: string; tipo: string | null; url: string | null; fecha_vencimiento: string | null; estado: string }[];
}

interface PortalDoc {
  id: string;
  nombre: string;
  tipo: string | null;
  url: string | null;
  fecha_vencimiento: string | null;
  estado: string;
}

interface PortalData {
  cliente: { id: string; nombre: string; empresa_nombre: string; tipo: string };
  trabajadores: PortalTrabajador[];
  documentos_empresa: PortalDoc[];
}

export default function Portal() {
  const [nit, setNit] = useState("");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [viewDocs, setViewDocs] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!nit.trim()) return;
    setLoading(true);
    setError("");
    const { data: result, error: rpcError } = await supabase.rpc("get_portal_cliente", { p_nit_cedula: nit.trim() });

    if (rpcError || !result) {
      setError("No encontrado. Contacta a tu empresa contratante.");
      setLoading(false);
      return;
    }
    setData(result as unknown as PortalData);
    setLoading(false);
  };

  const estadoColor = (e: string) => {
    if (e === "aprobado" || e === "activo" || e === "vigente") return "default";
    if (e === "pendiente") return "secondary";
    return "destructive";
  };

  // Login screen
  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <img src={logoSstlink} alt="SSTLink" className="h-10 mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Portal de Clientes</h1>
            <p className="text-sm text-muted-foreground">Ingresa tu NIT o número de cédula para acceder.</p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="NIT o Cédula"
              value={nit}
              onChange={e => setNit(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              maxLength={50}
            />
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Ingresar
            </Button>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>

          <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" /> Plataforma segura · SSTLink
          </p>
        </div>
      </div>
    );
  }

  const selectedWorker = viewDocs ? data.trabajadores.find(t => t.id === viewDocs) : null;

  // Portal view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-surface/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <img src={logoSstlink} alt="SSTLink" className="h-7" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">{data.cliente.empresa_nombre}</span>
              <span className="text-muted-foreground ml-2">· {data.cliente.nombre}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setData(null); setNit(""); setViewDocs(null); }}>
            Salir
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Worker documents detail */}
        {selectedWorker ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setViewDocs(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <h2 className="text-lg font-bold">{selectedWorker.nombres} {selectedWorker.apellidos}</h2>
            <p className="text-sm text-muted-foreground">{selectedWorker.cargo} · {selectedWorker.tipo_documento} {selectedWorker.numero_documento}</p>

            {selectedWorker.documentos.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4">No hay documentos disponibles.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {selectedWorker.documentos.map(doc => (
                  <Card key={doc.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{doc.nombre}</p>
                        {doc.fecha_vencimiento && <p className="text-xs text-muted-foreground">Vence: {doc.fecha_vencimiento}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={estadoColor(doc.estado)} className="text-[10px]">{doc.estado}</Badge>
                      {doc.url && (
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Empresa info card */}
            {!selectedWorker && (
              <div className="bg-surface border-[0.5px] border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">{data.cliente.empresa_nombre}</h2>
                    <p className="text-[12px] text-muted-foreground">Portal verificado · SSTLink</p>
                  </div>
                </div>
              </div>
            )}

            {/* Company documents section */}
            {data.documentos_empresa.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3">Documentos de la empresa</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.documentos_empresa.map(doc => (
                    <Card key={doc.id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.nombre}</p>
                          {doc.fecha_vencimiento && <p className="text-xs text-muted-foreground">Vence: {doc.fecha_vencimiento}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={estadoColor(doc.estado)} className="text-[10px]">{doc.estado}</Badge>
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Workers section */}
            <section>
              <h2 className="text-lg font-bold text-foreground mb-3">Trabajadores asignados</h2>
              {data.trabajadores.length === 0 ? (
                <p className="text-muted-foreground text-sm">No hay trabajadores asignados.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.trabajadores.map(t => (
                    <Card key={t.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{t.nombres} {t.apellidos}</p>
                            <p className="text-xs text-muted-foreground">{t.cargo ?? "Sin cargo"}</p>
                          </div>
                        </div>
                        <Badge variant={estadoColor(t.estado)} className="text-[10px]">{t.estado}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>{t.tipo_documento}: {t.numero_documento}</p>
                        {t.arl && <p>ARL: {t.arl}</p>}
                        {t.eps && <p>EPS: {t.eps}</p>}
                      </div>
                      <Button variant="outline" size="sm" className="w-full text-xs mt-1" onClick={() => setViewDocs(t.id)}>
                        <FileText className="w-3.5 h-3.5 mr-1" /> Ver documentos ({t.documentos.length})
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <p className="flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> SSTLink — Seguridad y Salud en el Trabajo</p>
      </footer>
    </div>
  );
}
