import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface FaseData {
  fase: string;
  total: number;
  completados: number;
  en_progreso: number;
  porcentaje: number;
  puntos_total: number;
  puntos_obtenidos: number;
}

export interface CumplimientoData {
  porcentaje: number;
  total: number;
  completados: number;
  puntos_total: number;
  puntos_obtenidos: number;
  nivel: string;
  fases: FaseData[];
}

export interface EstandarExport {
  codigo: string;
  nombre: string;
  fase: string;
  grupo: string;
  puntaje: number;
  estado: "completado" | "en_progreso" | "sin_iniciar";
  doc_subido: boolean;
  plantilla_subida: boolean;
}

interface ExportArgs {
  empresaNombre: string;
  empresaNit?: string | null;
  cumplimiento: CumplimientoData;
  estandares: EstandarExport[];
}

const FASE_COLORS: Record<string, [number, number, number]> = {
  PLANEAR: [59, 130, 246],
  HACER: [245, 158, 11],
  VERIFICAR: [139, 92, 246],
  ACTUAR: [34, 197, 94],
};

const ESTADO_LABEL: Record<string, string> = {
  completado: "Completado",
  en_progreso: "En progreso",
  sin_iniciar: "Sin iniciar",
};

const fmt = (n: number) => (Number.isInteger(n) ? n.toString() : n.toFixed(1));

export function exportSgsstPdf({ empresaNombre, empresaNit, cumplimiento, estandares }: ExportArgs) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(255, 107, 44);
  doc.rect(0, 0, pageW, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(10, 14, 26);
  doc.text("Reporte SG-SST", margin, y + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Ciclo PHVA · Resolucion 0312 de 2019", margin, y + 36);

  // Fecha (derecha)
  const fecha = new Date().toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric"
  });
  doc.text(`Generado: ${fecha}`, pageW - margin, y + 20, { align: "right" });
  doc.text(`Nivel: ${cumplimiento.nivel} estandares`, pageW - margin, y + 36, { align: "right" });

  y += 60;

  // Empresa
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 14, 26);
  doc.text(empresaNombre, margin, y);
  if (empresaNit) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`NIT ${empresaNit}`, margin, y + 14);
  }
  y += 30;

  // Cumplimiento global
  doc.setDrawColor(230);
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, 70, 6, 6, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.setTextColor(255, 107, 44);
  doc.text(`${cumplimiento.porcentaje}%`, margin + 16, y + 42);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 14, 26);
  doc.text("Cumplimiento global ponderado", margin + 110, y + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(
    `${fmt(cumplimiento.puntos_obtenidos)} de ${fmt(cumplimiento.puntos_total)} puntos`,
    margin + 110, y + 44
  );
  doc.text(
    `${cumplimiento.completados} de ${cumplimiento.total} estandares completados`,
    margin + 110, y + 58
  );

  y += 90;

  // Resumen por fase (tabla)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(10, 14, 26);
  doc.text("Cumplimiento por fase PHVA", margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    head: [["Fase", "%", "Puntos", "Completados", "En progreso", "Sin iniciar", "Total"]],
    body: cumplimiento.fases.map(f => {
      const sin_iniciar = f.total - f.completados - f.en_progreso;
      return [
        f.fase,
        `${f.porcentaje}%`,
        `${fmt(f.puntos_obtenidos)} / ${fmt(f.puntos_total)}`,
        f.completados.toString(),
        f.en_progreso.toString(),
        sin_iniciar.toString(),
        f.total.toString(),
      ];
    }),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [10, 14, 26], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [248, 248, 250] },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
      6: { halign: "right" },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const c = FASE_COLORS[data.cell.raw as string];
        if (c) data.cell.styles.textColor = c;
      }
    },
    margin: { left: margin, right: margin },
  });

  // Detalle por fase
  const fases = ["PLANEAR", "HACER", "VERIFICAR", "ACTUAR"];
  for (const fase of fases) {
    const items = estandares.filter(e => e.fase === fase);
    if (items.length === 0) continue;

    const lastY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    let nextY = lastY + 24;

    if (nextY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      nextY = margin;
    }

    const color = FASE_COLORS[fase];
    doc.setFillColor(...color);
    doc.rect(margin, nextY - 12, 4, 14, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(10, 14, 26);
    doc.text(`Detalle: ${fase}`, margin + 10, nextY);

    autoTable(doc, {
      startY: nextY + 6,
      head: [["Codigo", "Estandar", "Grupo", "Pts", "Doc", "Plantilla", "Estado"]],
      body: items.map(it => [
        it.codigo,
        it.nombre,
        it.grupo,
        fmt(it.puntaje),
        it.doc_subido ? "Si" : "-",
        it.plantilla_subida ? "Si" : "-",
        ESTADO_LABEL[it.estado],
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: color, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 70 },
        3: { cellWidth: 28, halign: "right" },
        4: { cellWidth: 30, halign: "center" },
        5: { cellWidth: 50, halign: "center" },
        6: { cellWidth: 70 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 6) {
          const v = data.cell.raw as string;
          if (v === "Completado") data.cell.styles.textColor = [22, 163, 74];
          else if (v === "En progreso") data.cell.styles.textColor = [245, 158, 11];
          else data.cell.styles.textColor = [120, 120, 120];
        }
      },
      margin: { left: margin, right: margin },
    });
  }

  // Pie de pagina en todas las paginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `SSTLink · ${empresaNombre}`,
      margin,
      doc.internal.pageSize.getHeight() - 20
    );
    doc.text(
      `Pagina ${i} de ${pageCount}`,
      pageW - margin,
      doc.internal.pageSize.getHeight() - 20,
      { align: "right" }
    );
  }

  const filename = `SG-SST_${empresaNombre.replace(/[^a-z0-9]/gi, "_")}_${new Date()
    .toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
