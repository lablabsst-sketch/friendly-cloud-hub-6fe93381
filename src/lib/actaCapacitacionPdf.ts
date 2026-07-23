import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface ActaAsistente {
  nombre: string;
  numero_documento: string;
  cargo: string | null;
  tipo: "trabajador" | "contratista";
  asistio: boolean;
  firma_url: string | null;
  firmado_en: string | null;
  nota: number | null;
}

export interface ActaCapacitacion {
  titulo: string;
  fecha: string;
  fecha_cierre?: string | null;
  tipo?: string | null;
  modalidad: string;
  responsable?: string | null;
  duracion_horas?: number | null;
  descripcion?: string | null;
}

export interface ActaEmpresa {
  nombre: string;
  nit?: string | null;
}

/** Fetch a remote image and convert it to PNG dataURL. Returns null on failure. */
async function fetchAsPng(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export async function exportActaCapacitacionPdf(args: {
  capacitacion: ActaCapacitacion;
  asistentes: ActaAsistente[];
  empresa: ActaEmpresa;
}) {
  const { capacitacion: cap, asistentes, empresa } = args;

  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  // Banda naranja superior
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 0, pageW, 6, "F");

  // Encabezado empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(empresa.nombre, margin, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  if (empresa.nit) doc.text(`NIT ${empresa.nit}`, margin, y + 32);

  const generado = new Date().toLocaleString("es-CO");
  doc.text(`Generado: ${generado}`, pageW - margin, y + 18, { align: "right" });
  doc.setFontSize(8);
  doc.text("SG-SST · Decreto 1072/2015", pageW - margin, y + 32, { align: "right" });

  y += 52;

  // Título
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageW - margin, y);
  y += 14;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text("Acta de Capacitación", margin, y);
  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(cap.titulo, margin, y);
  y += 18;

  // Ficha de datos
  const fmtFecha = (d?: string | null) =>
    d ? new Date(d + "T12:00:00").toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" }) : "—";

  const rows: [string, string][] = [
    ["Fecha", fmtFecha(cap.fecha)],
    ["Cierre", cap.fecha_cierre ? fmtFecha(cap.fecha_cierre) : "Permanente"],
    ["Tipo", cap.tipo ?? "—"],
    ["Modalidad", cap.modalidad ? cap.modalidad.charAt(0).toUpperCase() + cap.modalidad.slice(1) : "—"],
    ["Responsable", cap.responsable ?? "—"],
    ["Duración", cap.duracion_horas ? `${cap.duracion_horas} h` : "—"],
  ];

  autoTable(doc, {
    startY: y,
    body: rows,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 3, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 90, textColor: [100, 116, 139] },
      1: { cellWidth: "auto" },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // Descripción / temas
  if (cap.descripcion && cap.descripcion.trim()) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Temas / Descripción", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(cap.descripcion, pageW - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 11 + 8;
  }

  // Pre-cargar firmas
  const firmasCache: Record<string, string | null> = {};
  await Promise.all(
    asistentes
      .filter((a) => a.firma_url)
      .map(async (a) => {
        firmasCache[a.firma_url!] = await fetchAsPng(a.firma_url!);
      })
  );

  // Tabla de asistentes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(`Asistentes (${asistentes.length})`, margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["#", "Nombre", "Documento", "Cargo", "Asistió", "Fecha firma", "Firma", "Nota"]],
    body: asistentes.map((a, i) => [
      String(i + 1),
      a.nombre,
      a.numero_documento || "—",
      a.cargo || "—",
      a.asistio ? "Sí" : "No",
      a.firmado_en ? new Date(a.firmado_en).toLocaleString("es-CO") : "—",
      "", // firma image col
      a.nota != null ? String(a.nota) : "—",
    ]),
    styles: { fontSize: 8, cellPadding: 4, valign: "middle", textColor: [30, 41, 59] },
    headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 22, halign: "center" },
      1: { cellWidth: 120 },
      2: { cellWidth: 65 },
      3: { cellWidth: 70 },
      4: { cellWidth: 40, halign: "center" },
      5: { cellWidth: 75, fontSize: 7 },
      6: { cellWidth: 90, halign: "center" },
      7: { cellWidth: 30, halign: "center" },
    },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        const v = data.cell.raw as string;
        data.cell.styles.textColor = v === "Sí" ? [22, 163, 74] : [148, 163, 184];
        data.cell.styles.fontStyle = "bold";
      }
      if (data.section === "body" && data.column.index === 6) {
        data.cell.styles.minCellHeight = 34;
      }
    },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== 6) return;
      const a = asistentes[data.row.index];
      if (!a?.firma_url) return;
      const dataUrl = firmasCache[a.firma_url];
      if (!dataUrl) return;
      const pad = 2;
      const cellW = data.cell.width - pad * 2;
      const cellH = data.cell.height - pad * 2;
      const imgW = Math.min(cellW, 84);
      const imgH = Math.min(cellH, 30);
      try {
        doc.addImage(
          dataUrl,
          "PNG",
          data.cell.x + (data.cell.width - imgW) / 2,
          data.cell.y + (data.cell.height - imgH) / 2,
          imgW,
          imgH,
          undefined,
          "FAST"
        );
      } catch {
        // ignore
      }
    },
  });

  // Pie legal en todas las páginas
  const pageCount = doc.getNumberOfPages();
  const fechaHoy = new Date().toLocaleDateString("es-CO");
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageH - 34, pageW - margin, pageH - 34);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Documento conservado según Decreto 1072/2015 (SG-SST). Generado el ${fechaHoy}.`,
      margin,
      pageH - 20
    );
    doc.text(`Página ${i} de ${pageCount}`, pageW - margin, pageH - 20, { align: "right" });
  }

  const filename = `acta-capacitacion-${slug(cap.titulo)}-${cap.fecha}.pdf`;
  doc.save(filename);
}
