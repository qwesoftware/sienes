import { Document, Header as PageHeader, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { Header } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";
import { formatDate } from "@/lib/format";

export type RhcDocumentInput = {
  header: Header;
  insurerLabel: string;
  draft: Draft;
  dateRange: { from: string; to: string } | null;
  // The Sienes logo PNG (435x125), placed in the page header; see `loadLogo`.
  logo?: Uint8Array;
};

const cudLabels = { yes: "Sí", no: "No", unknown: "Sin información" } as const;

function row(label: string, value: string | null): TableRow {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
      new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph(value ?? "")] }),
    ],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
}

function paragraphs(text: string): Paragraph[] {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return (lines.length ? lines : [""]).map((line) => new Paragraph({ text: line, spacing: { after: 120 } }));
}

// The PAMI-format RHC as a Word document: member data from the header,
// the reviewed sections, diagnosis and prestación fields, and a separate
// pending-review section for alerts about missing information. Alerts are
// never written as clinical facts.
export function buildRhcDocument({ header, insurerLabel, draft, dateRange, logo }: RhcDocumentInput): Document {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: "Resumen de historia clínica", heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      text: dateRange ? `Período documentado: ${formatDate(dateRange.from)} al ${formatDate(dateRange.to)}` : "",
      spacing: { after: 240 },
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        row("Paciente", header.patientName.value),
        row("DNI", header.documentNumber.value),
        row("Fecha de nacimiento", header.birthDate.value),
        row("Edad", header.age.value),
        row("Obra social", insurerLabel),
        row("Cobertura", header.coverageCode.value),
        row("Plan", header.plan.value),
        row("Nº de afiliado", header.memberNumber.value),
        row("CUD", cudLabels[header.cud]),
      ],
    }),
    heading("Diagnóstico"),
    ...paragraphs([draft.diagnosis.text ?? "", draft.diagnosis.cie10 ? `CIE-10: ${draft.diagnosis.cie10}` : ""].filter(Boolean).join("\n")),
    heading("Prestación"),
    ...paragraphs(
      [
        draft.prestacion.practiceCode ? `Práctica: ${draft.prestacion.practiceCode}` : "",
        draft.prestacion.module ? `Módulo: ${draft.prestacion.module}` : "",
        draft.prestacion.quantity !== null ? `Cantidad: ${draft.prestacion.quantity}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  ];
  for (const section of draft.sections) {
    if (section.key === "diagnosis") continue; // already in the field above
    children.push(heading(section.title), ...paragraphs(section.text));
  }
  const pending = draft.alerts.filter((a) => a.code === "missing-information" || a.code === "no-clinical-content");
  if (pending.length > 0) {
    children.push(heading("Pendiente de revisión"), ...pending.map((a) => new Paragraph({ text: a.message, bullet: { level: 0 } })));
  }
  return new Document({
    creator: "Sienes",
    title: "Resumen de historia clínica",
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        headers: logo
          ? {
              default: new PageHeader({
                children: [
                  new Paragraph({
                    children: [
                      new ImageRun({
                        type: "png",
                        data: logo,
                        transformation: { width: 139, height: 40 },
                        altText: { name: "Sienes", description: "Sienes, neurorehabilitación", title: "Sienes" },
                      }),
                    ],
                  }),
                ],
              }),
            }
          : undefined,
        children,
      },
    ],
  });
}

export function rhcFileName(header: Header): string {
  const name = (header.patientName.value ?? "paciente").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
  return `RHC-${name}.docx`;
}

export async function rhcBlob(input: RhcDocumentInput): Promise<Blob> {
  return Packer.toBlob(buildRhcDocument(input));
}
