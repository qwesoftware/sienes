// Local evaluation only: turns a Medexis JSON note export (an array of
// { Fecha, Texto, Tipo, Profesional }) into a ParsedExport with no header,
// so the real exports held locally as JSON can run through the case runner.
// The application reads only PDF exports; this adapter never ships.
import type { ParsedExport } from "@/contracts/case";

type JsonNote = { Fecha: string; Texto: string; Tipo: string; Profesional: string };

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (match, name: string) => entities[name.toLowerCase()] ?? namedEntity(name) ?? match);
}

// The accented letters Medexis emits as named entities (aacute, ntilde, ...).
function namedEntity(name: string): string | undefined {
  const m = /^([A-Za-z])(acute|grave|tilde|uml|circ)$/.exec(name);
  if (!m) return undefined;
  const marks: Record<string, string> = { acute: "́", grave: "̀", tilde: "̃", uml: "̈", circ: "̂" };
  return (m[1] + marks[m[2]]).normalize("NFC");
}

export function htmlToText(html: string): string {
  const withBreaks = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d|tr)>/gi, "\n");
  return decodeEntities(withBreaks.replace(/<[^>]+>/g, ""))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line !== "")
    .join("\n");
}

export function parseMedexisJson(json: string): ParsedExport {
  const raw = JSON.parse(json) as JsonNote[];
  if (!Array.isArray(raw)) throw new Error("expected a JSON array of notes");
  const notes = raw
    .map((n, i) => {
      const [date, time] = n.Fecha.split(" ");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`note ${i + 1}: unexpected date format`);
      const text = htmlToText(n.Texto);
      if (text === "") return null;
      return {
        id: `n${i + 1}`,
        recordedDate: date,
        recordedTime: time ? time.slice(0, 5) : null,
        authorName: n.Profesional,
        authorSpecialtyLabel: null,
        authorSpecialtyKey: null,
        registration: null,
        text: n.Tipo ? `[${n.Tipo}] ${text}` : text,
        pages: [1],
      };
    })
    .filter((n) => n !== null)
    .sort((a, b) => a.recordedDate.localeCompare(b.recordedDate));
  const missing = { value: null, status: "missing" as const };
  const dates = notes.map((n) => n.recordedDate);
  return {
    header: { patientName: missing, documentNumber: missing, birthDate: missing, age: missing, coverageCode: missing, plan: missing, memberNumber: missing, cud: "unknown" },
    notes,
    pageCount: 0,
    imageOnlyPages: [],
    dateRange: dates.length ? { from: dates[0], to: dates[dates.length - 1] } : null,
  };
}
