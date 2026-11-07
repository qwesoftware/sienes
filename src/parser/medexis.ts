import type { Header, HeaderField, Note, ParsedExport } from "@/contracts/case";
import type { Line, PageLines } from "./lines";
import { resolveSpecialty } from "./specialties";

// Rebuilds a Medexis export from positioned lines: one administrative header
// (which may repeat on later pages for the same patient) followed by notes.
// Each note starts with "dd/mm/yyyy hh:mm - NN años" on the left and the
// author on the right, then the specialty label and the "MP: n" registration
// on their own right-aligned lines. "Página N" footers are dropped. Text is
// treated as data: nothing here interprets instructions found in notes.

export class ParseError extends Error {
  constructor(
    public readonly code: "no-text" | "no-header" | "patient-mismatch",
    message: string,
  ) {
    super(message);
  }
}

const NOTE_HEADER = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})\s*-\s*(\d+)\s+años?\b\s*(.*)$/;
const PAGE_FOOTER = /^Página\s+\d+$/i;
const REGISTRATION = /^MP:?\s*([0-9.\/-]+)$/i;
const DNI_LINE = /\bDNI\s+([0-9.]+)/i;
const AGE = /\bEdad:\s*(\d+)\s*años?/i;
const BIRTH = /Fec\.?\s*Nac\.?:\s*(\d{2}\/\d{2}\/\d{4})/i;
const COVERAGE_CODE = /^\d{1,4}-[A-ZÁÉÍÓÚÑ0-9 .&-]+$/;
const PLAN = /^\(([^)]+)\)$/;
const MEMBER = /^[0-9A-Z.\/-]{4,}$/;

function field(value: string | null): HeaderField {
  return value === null || value.trim() === "" ? { value: null, status: "missing" } : { value: value.trim(), status: "extracted" };
}

type HeaderCandidate = { header: Header; endIndex: number };

// The header starts at the line that carries the "Cobertura" label on the
// right; the patient name is the left segment of that same line.
function readHeader(lines: Line[], start: number, pageWidth: number): HeaderCandidate | null {
  const rightEdge = pageWidth * 0.55;
  for (let i = start; i < Math.min(lines.length, start + 12); i++) {
    const line = lines[i];
    const label = line.segments.find((s) => s.x > rightEdge && /^Cobertura$/i.test(s.text));
    if (!label) continue;
    const left = line.segments.filter((s) => s.x <= rightEdge).map((s) => s.text).join(" ");
    let name: string | null = left || null;
    let dni: string | null = null;
    let age: string | null = null;
    let birth: string | null = null;
    let coverage: string | null = null;
    let plan: string | null = null;
    let member: string | null = null;
    let endIndex = i;
    for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
      const l = lines[j];
      if (NOTE_HEADER.test(l.text)) break;
      const leftText = l.segments.filter((s) => s.x <= rightEdge).map((s) => s.text).join(" ");
      const rightSegments = l.segments.filter((s) => s.x > rightEdge);
      if (!name && j === i + 1 && leftText) name = leftText;
      const dniMatch = leftText.match(DNI_LINE);
      if (dniMatch) dni = dniMatch[1];
      const ageMatch = leftText.match(AGE);
      if (ageMatch) age = ageMatch[1];
      const birthMatch = leftText.match(BIRTH);
      if (birthMatch) birth = birthMatch[1];
      for (const s of rightSegments) {
        if (!coverage && COVERAGE_CODE.test(s.text)) coverage = s.text;
        else if (!plan && PLAN.test(s.text)) plan = s.text.match(PLAN)![1];
        else if (coverage && !member && MEMBER.test(s.text)) member = s.text;
      }
      endIndex = j;
      if (dni && coverage && plan && member) break;
    }
    return {
      header: {
        patientName: field(name),
        documentNumber: field(dni),
        birthDate: field(birth),
        age: field(age),
        coverageCode: field(coverage),
        plan: field(plan),
        memberNumber: field(member),
        cud: "unknown",
      },
      endIndex,
    };
  }
  return null;
}

function sameRecordHolder(a: Header, b: Header): boolean {
  if (a.documentNumber.value && b.documentNumber.value) return a.documentNumber.value === b.documentNumber.value;
  return (a.patientName.value ?? "").toLowerCase() === (b.patientName.value ?? "").toLowerCase();
}

type NoteDraft = Omit<Note, "text" | "pages"> & { body: string[]; pages: Set<number>; awaitingMeta: boolean };

export function parseMedexis(pages: PageLines[]): ParsedExport {
  const imageOnlyPages = pages.filter((p) => p.lines.length === 0).map((p) => p.page);
  const textPages = pages.filter((p) => p.lines.length > 0);
  if (textPages.length === 0) {
    throw new ParseError("no-text", "El PDF no tiene texto legible. Exportalo de nuevo desde Medexis sin escanear.");
  }

  let header: Header | null = null;
  const notes: NoteDraft[] = [];
  let current: NoteDraft | null = null;
  let noteIndex = 0;

  for (const page of textPages) {
    const rightEdge = page.width * 0.55;
    let i = 0;
    // A header block may open any page; the first one defines the patient.
    const candidate = readHeader(page.lines, 0, page.width);
    if (candidate) {
      if (!header) header = candidate.header;
      else if (!sameRecordHolder(header, candidate.header)) {
        throw new ParseError("patient-mismatch", "El PDF contiene encabezados de más de un paciente. Exportá un PDF por paciente.");
      }
      i = candidate.endIndex + 1;
    }
    for (; i < page.lines.length; i++) {
      const line = page.lines[i];
      if (PAGE_FOOTER.test(line.text)) continue;
      const m = line.text.match(NOTE_HEADER);
      if (m) {
        const [, dd, mm, yyyy, hh, min] = m;
        const author = line.segments
          .filter((s) => s.x > rightEdge)
          .map((s) => s.text)
          .join(" ")
          .trim();
        current = {
          id: `n${++noteIndex}`,
          recordedDate: `${yyyy}-${mm}-${dd}`,
          recordedTime: `${hh}:${min}`,
          authorName: author,
          authorSpecialtyLabel: null,
          authorSpecialtyKey: null,
          registration: null,
          body: [],
          pages: new Set([page.page]),
          awaitingMeta: true,
        };
        notes.push(current);
        continue;
      }
      if (!current) continue; // institution lines before the first note
      current.pages.add(page.page);
      if (current.awaitingMeta) {
        const onlyRight = line.segments.length > 0 && line.segments.every((s) => s.x > rightEdge);
        const reg = line.text.match(REGISTRATION);
        if (reg) {
          current.registration = reg[1];
          current.awaitingMeta = false;
          continue;
        }
        if (onlyRight && current.authorSpecialtyLabel === null) {
          current.authorSpecialtyLabel = line.text;
          current.authorSpecialtyKey = resolveSpecialty(line.text)?.key ?? null;
          continue;
        }
        current.awaitingMeta = false;
      }
      current.body.push(line.segments.map((s) => s.text).join(" "));
    }
    if (current) current.body.push("");
  }

  if (!header) {
    throw new ParseError("no-header", "No se encontró el encabezado del paciente en el PDF.");
  }

  const finished: Note[] = notes.map((n) => ({
    id: n.id,
    recordedDate: n.recordedDate,
    recordedTime: n.recordedTime,
    authorName: n.authorName,
    authorSpecialtyLabel: n.authorSpecialtyLabel,
    authorSpecialtyKey: n.authorSpecialtyKey,
    registration: n.registration,
    text: n.body
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim(),
    pages: [...n.pages].sort((a, b) => a - b),
  }));

  const dates = finished.map((n) => n.recordedDate).sort();
  return {
    header,
    notes: finished,
    pageCount: pages.length,
    imageOnlyPages,
    dateRange: dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
  };
}
