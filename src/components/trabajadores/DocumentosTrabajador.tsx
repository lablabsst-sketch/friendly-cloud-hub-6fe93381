import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload, Download, Trash2, FileText, Loader2, Calendar, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

const TIPOS_DOCUMENTO = [
  { key: "cedula",      label: "Documento de identidad",       icon: "🪪", requiereVencimiento: false },
  { key: "arl",         label: "ARL",                          icon: "🛡️", requiereVencimiento: true  },
  { key: "eps",         label: "EPS",                          icon: "🏥", requiereVencimiento: true  },
  { key: "pension",     label: "Pensión",                      icon: "💰", requiereVencimiento: true  },
  { key: "caja",        label: "Caja de compensación",         icon: "🏦", requiereVencimiento: true  },
  { key: "planilla",    label: "Planilla seguridad social",    icon: "📄", requiereVencimiento: true  },
  { key: "examen",      label: "Examen médico ocupacional",    icon: "🩺", requiereVencimiento: true  },
  { key: "contrato",    label: "Contrato laboral",             icon: "📝", requiereVencimiento: false },
  { key: "hv",          label: "Hoja de vida",                 icon: "👤", requiereVencimiento: false },
  { key: "vacunas",     label: "Carné de vacunas",             icon: "💉", requiereVencimiento: false },
  { key: "certificado", label: "Certificado de capacitación",  icon: "🎓", requiereVencimiento: false },
  { key: "otro",        label: "Otro documento",               icon: "📎", requiereVencimiento: false },
];

// Map DB row to our internal shape
interface Documento {
  id: string;
  tipo: string;
  url: string | null;
  fecha_vencimiento: string | null;
  estado: string;
  created_at: string;
}

interface Props {
  trabajadorId: string;
  trabajadorNombre: string;
  canEdit?: boolean;
}

function EstadoBadge({ fechaVencimiento }: { fechaVencimiento: string | null }) {
  if (!fechaVencimiento) return <Badge variant="outline" className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200">Sin vencimiento</Badge>;
  const dias = differenceInDays(new Date(fechaVencimiento + "T00:00:00"), new Date());
  if (dias < 0) return <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-700 border-red-200 gap-1"><AlertTriangle className="w-2.5 h-2.5" />Vencido</Badge>;
  if (dias <= 30) return <Badge variant="outline" className="text-[10px] h-5 bg-amber-50 text-amber-700 border-amber-200 gap-1"><Clock className="w-2.5 h-2.5" />Vence en {dias}d</Badge>;
  return <Badge variant="outline" className="text-[10px] h-5 bg-emerald-50 text-emerald-700 border-emerald-200 gap-1"><CheckCircle2 className="w-2.5 h-2.5" />Vigente</Badge>;
}

export function DocumentosTrabajador({ trabajadorId, trabajadorNombre, canEdit = true }: Props) {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [fechaVenc, setFechaVenc] = useState<Record<string, Date | undefined>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tipoActivo, setTipoActivo] = useState<string | null>(null);

  const fetchDocumentos = async () => {
    const { data } = await supabase
      .from("documentos_trabajador")
      .select("id, tipo, url, fecha_vencimiento, estado, created_at")
      .eq("trabajador_id", trabajadorId)
      .order("created_at", { ascending: false });
    setDocumentos(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchDocumentos(); }, [trabajadorId]);

  const handleUpload = async (tipo: string, file: File) => {
    if (!empresa?.id) return;
    setUploading(tipo);
    try {
      const ext = file.name.split(".").pop();
      const path = `${empresa.id}/${trabajadorId}/${tipo}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("documentos").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("documentos").getPublicUrl(path);
      const venc = fechaVenc[tipo];

      // Mark previous as replaced
      const anterior = documentos.find(d => d.tipo === tipo && d.estado === "vigente");
      if (anterior) {
        await supabase.from("documentos_trabajador").update({ estado: "reemplazado" }).eq("id", anterior.id);
      }

      const { error: dbError } = await supabase.from("documentos_trabajador").insert({
        empresa_id: empresa.id,
        trabajador_id: trabajadorId,
        nombre: TIPOS_DOCUMENTO.find(t => t.key === tipo)?.label ?? tipo,
        tipo,
        url: publicUrl,
        fecha_vencimiento: venc ? format(venc, "yyyy-MM-dd") : null,
        estado: "vigente",
      });
      if (dbError) throw dbError;

      toast({ title: "Documento subido correctamente." });
      fetchDocumentos();
    } catch (err: any) {
      toast({ title: "Error al subir el archivo", description: err.message, variant: "destructive" });
    }
    setUploading(null);
    setTipoActivo(null);
  };

  const handleDelete = async (doc: Documento) => {
    const { error } = await supabase.from("documentos_trabajador").delete().eq("id", doc.id);
    if (error) { toast({ title: "Error al eliminar", variant: "destructive" }); return; }
    toast({ title: "Documento eliminado." });
    fetchDocumentos();
  };

  const handleDownload = (url: string, tipo: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.download = `${trabajadorNombre}-${tipo}`;
    a.click();
  };

  const triggerUpload = (tipo: string) => {
    setTipoActivo(tipo);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && tipoActivo) handleUpload(tipoActivo, file);
    e.target.value = "";
  };

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onFileChange} />

      {TIPOS_DOCUMENTO.map(tipo => {
        const docVigente = documentos.find(d => d.tipo === tipo.key && d.estado === "vigente");
        const isUploading = uploading === tipo.key;

        return (
          <div key={tipo.key} className={cn(
            "rounded-lg border p-3 flex items-center gap-3 transition-colors",
            docVigente ? "bg-card border-border" : "bg-muted/30 border-dashed border-muted-foreground/20"
          )}>
            <span className="text-lg shrink-0">{tipo.icon}</span>

            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium text-foreground">{tipo.label}</p>
              {docVigente ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <EstadoBadge fechaVencimiento={docVigente.fecha_vencimiento} />
                  {docVigente.fecha_vencimiento && (
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(docVigente.fecha_vencimiento + "T00:00:00"), "dd MMM yyyy", { locale: es })}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground/60">
                    Subido {format(new Date(docVigente.created_at), "dd MMM yyyy", { locale: es })}
                  </span>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground mt-0.5">Sin documento</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {canEdit && tipo.requiereVencimiento && !docVigente && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] px-2 gap-1">
                      <Calendar className="w-3 h-3" />
                      {fechaVenc[tipo.key] ? format(fechaVenc[tipo.key]!, "dd/MM/yy") : "Vence"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarUI mode="single" selected={fechaVenc[tipo.key]}
                      onSelect={d => setFechaVenc(p => ({ ...p, [tipo.key]: d }))}
                      initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              )}

              {docVigente && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDownload(docVigente.url ?? "", tipo.key)}>
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDelete(docVigente)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </>
              )}

              {canEdit && (
                <Button variant={docVigente ? "outline" : "default"} size="sm"
                  className="h-7 text-[10px] px-2.5 gap-1" disabled={isUploading}
                  onClick={() => triggerUpload(tipo.key)}>
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {docVigente ? "Actualizar" : "Subir"}
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {/* Historial */}
      {documentos.filter(d => d.estado !== "vigente").length > 0 && (
        <details className="mt-3">
          <summary className="text-[11px] text-muted-foreground cursor-pointer hover:text-foreground">
            Ver historial ({documentos.filter(d => d.estado !== "vigente").length} versiones anteriores)
          </summary>
          <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-muted">
            {documentos.filter(d => d.estado !== "vigente").map(d => {
              const tipo = TIPOS_DOCUMENTO.find(t => t.key === d.tipo);
              return (
                <div key={d.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[11px] text-muted-foreground">{tipo?.label ?? d.tipo}</span>
                    <span className="text-[10px] text-muted-foreground/50">
                      {format(new Date(d.created_at), "dd/MM/yyyy", { locale: es })}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleDownload(d.url ?? "", d.tipo)}>
                    <Download className="w-3 h-3 text-muted-foreground" />
                  </Button>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}
