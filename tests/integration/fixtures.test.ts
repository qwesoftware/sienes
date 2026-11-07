import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cases } from "../../fixtures/cases";
import { parsedExportSchema } from "@/contracts/case";
import { ParseError, parseMedexis } from "@/parser/medexis";
import { extractPagesNode } from "@/parser/pdf-node";

async function parseFixture(file: string) {
  const pages = await extractPagesNode(new Uint8Array(readFileSync(`fixtures/exports/${file}`)));
  return { pages, parsed: parseMedexis(pages) };
}

describe("fixture exports through PDF.js", () => {
  for (const fixture of cases) {
    it(`parses ${fixture.file} as described in fixtures/cases.ts`, async () => {
      const { pages, parsed } = await parseFixture(fixture.file);
      expect(parsedExportSchema.parse(parsed)).toBeTruthy();
      expect(pages.filter((p) => p.lines.length > 0)).toHaveLength(fixture.expect.textPages);
      expect(parsed.imageOnlyPages).toHaveLength(fixture.expect.imageOnlyPages);
      expect(parsed.notes.map((n) => n.authorSpecialtyLabel)).toEqual(fixture.expect.specialtyLabels);
      expect(parsed.header.patientName.value).toBe(fixture.header.name);
      expect(parsed.header.documentNumber.value).toBe(fixture.header.dni);
      expect(parsed.header.birthDate.value).toBe(fixture.header.birthDate);
      expect(parsed.header.coverageCode.value).toBe(fixture.header.coverageCode);
      expect(parsed.header.plan.value).toBe(fixture.header.plan);
      expect(parsed.header.memberNumber.value).toBe(fixture.header.memberNumber);
      const notes = fixture.items.filter((i) => i !== "image-page");
      parsed.notes.forEach((note, i) => {
        const [dd, mm, yyyy] = notes[i].date.split("/");
        expect(note.recordedDate).toBe(`${yyyy}-${mm}-${dd}`);
        expect(note.authorName).toBe(notes[i].author);
        expect(note.registration).toBe(notes[i].mp);
        // The body survives wrapping: every sentence of the fixture is in the parsed text.
        for (const sentence of notes[i].text.split("\n").filter(Boolean)) {
          expect(note.text.replace(/\s+/g, " ")).toContain(sentence.replace(/\s+/g, " "));
        }
      });
    });
  }

  it("keeps the mislabeled note under its printed label so the model, not the parser, decides", async () => {
    const { parsed } = await parseFixture("caso-a-renovacion-osde.pdf");
    const mislabeled = parsed.notes[1];
    expect(mislabeled.authorSpecialtyKey).toBe("psicologia");
    expect(mislabeled.text).toMatch(/kinesiología/i);
  });

  it("rejects the export without a text layer", async () => {
    const pages = await extractPagesNode(new Uint8Array(readFileSync("fixtures/exports/sin-texto.pdf")));
    expect(pages.every((p) => p.lines.length === 0)).toBe(true);
    expect(() => parseMedexis(pages)).toThrow(ParseError);
  });
});
