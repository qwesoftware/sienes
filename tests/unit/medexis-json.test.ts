import { describe, expect, it } from "vitest";
import { parsedExportSchema } from "@/contracts/case";
import { htmlToText, parseMedexisJson } from "../../scripts/medexis-json";

const sample = JSON.stringify([
  { Fecha: "2026-07-21 14:23:07", Texto: "<p>MC: trastornos mn&eacute;sicos.</p>\n\n<p>MH: AAS 100.&nbsp;</p>", Tipo: "Nota Medica", Profesional: "PEREZ ANA" },
  { Fecha: "2026-06-09 15:34:38", Texto: "<p>Control de migra&ntilde;as, 2 x semana.</p>", Tipo: "Comentario", Profesional: "GOMEZ LUIS" },
  { Fecha: "2026-08-01 09:00:00", Texto: "<p></p>", Tipo: "Comentario", Profesional: "GOMEZ LUIS" },
]);

describe("Medexis JSON export adapter", () => {
  it("strips HTML, decodes accents and keeps paragraphs apart", () => {
    expect(htmlToText("<p>MC: trastornos mn&eacute;sicos.</p>\n\n<p>Edad 64 a&ntilde;os&nbsp;</p><br>fin")).toBe("MC: trastornos mnésicos.\nEdad 64 años\nfin");
  });

  it("produces a valid export with dated, author-named notes in order and no header", () => {
    const parsed = parseMedexisJson(sample);
    expect(parsedExportSchema.parse(parsed)).toEqual(parsed);
    expect(parsed.notes.map((n) => [n.id, n.recordedDate, n.recordedTime, n.authorName])).toEqual([
      ["n2", "2026-06-09", "15:34", "GOMEZ LUIS"],
      ["n1", "2026-07-21", "14:23", "PEREZ ANA"],
    ]);
    expect(parsed.notes[0].text).toBe("[Comentario] Control de migrañas, 2 x semana.");
    expect(parsed.dateRange).toEqual({ from: "2026-06-09", to: "2026-07-21" });
    expect(parsed.header.patientName).toEqual({ value: null, status: "missing" });
  });
});
