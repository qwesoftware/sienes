import { describe, expect, it } from "vitest";
import { ParseError, parseMedexis } from "@/parser/medexis";
import type { Line, PageLines } from "@/parser/lines";

const W = 595;
const L = (segments: [number, string][]): Line => ({
  y: 0,
  segments: segments.map(([x, text]) => ({ x, width: text.length * 4, text })),
  text: segments.map(([, t]) => t).join("  "),
});
const page = (n: number, lines: Line[]): PageLines => ({ page: n, width: W, height: 842, lines });

const headerLines = (name = "PEREYRA, MARTA LUCIA", dni = "11222333") => [
  L([[131, "CENTRO FICTICIO"]]),
  L([[25, name], [420, "Cobertura"]]),
  L([[26, `DNI ${dni}`], [112, "Edad: 71 años"], [181, "Fec. Nac.: 03/05/1955"], [420, "390-OSDE"]]),
  L([[25, "AV. SIEMPREVIVA 742"]]),
  L([[420, "(210)"]]),
  L([[25, "Tel 1100000000"]]),
  L([[420, "61234567801"]]),
];

const note = (date: string, author: string, specialty: string, body: string[]) => [
  L([[27, `${date} 09:15`], [117, "- 71 años"], [381, author]]),
  L([[450, specialty]]),
  L([[470, "MP: 112233"]]),
  ...body.map((b) => L([[25, b]])),
];

describe("parseMedexis", () => {
  it("reads the header and the notes with their author, specialty, registration, pages and text", () => {
    const parsed = parseMedexis([
      page(1, [...headerLines(), ...note("02/09/2026", "RUIZ DIAZ CARLOS", "NEUROLOGIA", ["Control neurológico.", "Dx: secuela de ACV."]), L([[25, "Página 1"]])]),
      page(2, [...headerLines(), L([[25, "Continúa en página 2."]]), ...note("09/09/2026", "SOSA VALERIA", "PSICOLOGIA", ["Sesión."])]),
    ]);
    expect(parsed.header.patientName).toEqual({ value: "PEREYRA, MARTA LUCIA", status: "extracted" });
    expect(parsed.header.documentNumber.value).toBe("11222333");
    expect(parsed.header.birthDate.value).toBe("03/05/1955");
    expect(parsed.header.age.value).toBe("71");
    expect(parsed.header.coverageCode.value).toBe("390-OSDE");
    expect(parsed.header.plan.value).toBe("210");
    expect(parsed.header.memberNumber.value).toBe("61234567801");
    expect(parsed.notes).toHaveLength(2);
    const [first, second] = parsed.notes;
    expect(first).toMatchObject({
      id: "n1",
      recordedDate: "2026-09-02",
      recordedTime: "09:15",
      authorName: "RUIZ DIAZ CARLOS",
      authorSpecialtyLabel: "NEUROLOGIA",
      authorSpecialtyKey: "neurologia",
      registration: "112233",
      pages: [1, 2],
    });
    expect(first.text).toBe("Control neurológico.\nDx: secuela de ACV.\n\nContinúa en página 2.");
    expect(second.pages).toEqual([2]);
    expect(parsed.dateRange).toEqual({ from: "2026-09-02", to: "2026-09-09" });
  });

  it("keeps an unknown specialty label unresolved and a missing header field as missing", () => {
    const lines = headerLines().filter((l) => !l.text.includes("(210)"));
    const parsed = parseMedexis([page(1, [...lines, ...note("02/09/2026", "X", "ASTROLOGIA", ["a"])])]);
    expect(parsed.notes[0].authorSpecialtyLabel).toBe("ASTROLOGIA");
    expect(parsed.notes[0].authorSpecialtyKey).toBeNull();
    expect(parsed.header.plan).toEqual({ value: null, status: "missing" });
  });

  it("ignores image-only pages and reports them", () => {
    const parsed = parseMedexis([page(1, []), page(2, [...headerLines(), ...note("02/09/2026", "X", "NEUROLOGIA", ["a"])]), page(3, [])]);
    expect(parsed.imageOnlyPages).toEqual([1, 3]);
    expect(parsed.pageCount).toBe(3);
    expect(parsed.notes[0].pages).toEqual([2]);
  });

  it("rejects a PDF without any text layer", () => {
    expect(() => parseMedexis([page(1, []), page(2, [])])).toThrow(ParseError);
    expect(() => parseMedexis([page(1, [])])).toThrow(/sin escanear/);
  });

  it("rejects an export whose pages belong to different patients", () => {
    expect(() =>
      parseMedexis([page(1, [...headerLines(), ...note("02/09/2026", "X", "NEUROLOGIA", ["a"])]), page(2, [...headerLines("OTRO, PACIENTE", "99999999")])]),
    ).toThrow(/más de un paciente/);
  });

  it("rejects an export without a patient header", () => {
    expect(() => parseMedexis([page(1, note("02/09/2026", "X", "NEUROLOGIA", ["a"]))])).toThrow(/encabezado/);
  });
});
