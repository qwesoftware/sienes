// Generates synthetic Medexis-like exports in fixtures/exports/. Every person,
// clinician and clinical fact here is invented. The layout mimics the real
// print: institution block, patient header with a right column, notes that
// start with "dd/mm/yyyy hh:mm - NN años" plus a right-aligned author,
// specialty and "MP" line, a "Página N" footer, and optional scanned pages.
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { cases, type FixtureCase, type FixtureNote } from "../fixtures/cases";

const A4 = { width: 595.2, height: 842.88 };
const LEFT = 25;
const RIGHT = 565;
const TOP = 814;
const BOTTOM = 60;
const SIZE = 8;
const LEAD = 11;

class Writer {
  page!: PDFPage;
  y = TOP;
  pageNumber = 0;
  constructor(
    private readonly doc: PDFDocument,
    private readonly font: PDFFont,
    private readonly bold: PDFFont,
    private readonly fixture: FixtureCase,
  ) {}

  newPage(withHeader: boolean) {
    this.page = this.doc.addPage([A4.width, A4.height]);
    this.pageNumber++;
    this.y = TOP;
    this.page.drawText(`Página ${this.pageNumber}`, { x: LEFT, y: 30, size: SIZE, font: this.font });
    if (withHeader) this.header();
  }

  imagePage() {
    const page = this.doc.addPage([A4.width, A4.height]);
    this.pageNumber++;
    page.drawRectangle({ x: 40, y: 80, width: 515, height: 700, color: rgb(0.85, 0.85, 0.85) });
    page.drawRectangle({ x: 60, y: 600, width: 300, height: 8, color: rgb(0.6, 0.6, 0.6) });
    this.y = BOTTOM; // forces a fresh text page next
  }

  ensure(lines = 1) {
    if (this.y - lines * LEAD < BOTTOM) this.newPage(this.fixture.repeatHeader);
  }

  left(text: string, x = LEFT, font = this.font, size = SIZE) {
    this.page.drawText(text, { x, y: this.y, size, font });
  }

  right(text: string, font = this.font, size = SIZE) {
    const w = font.widthOfTextAtSize(text, size);
    this.page.drawText(text, { x: RIGHT - w, y: this.y, size, font });
  }

  down(n = 1) {
    this.y -= LEAD * n;
  }

  header() {
    const h = this.fixture.header;
    const inst = ["CENTRO FICTICIO DE REHABILITACIÓN", "Calle Inventada 123, Localidad Ejemplo, Buenos Aires", "Tel: 0000000000", "E-mail:: ejemplo@example.com"];
    for (const line of inst) {
      this.left(line, 131, this.font, line === inst[0] ? 10 : 8);
      this.down();
    }
    this.down();
    this.left(h.name, LEFT, this.bold, 11);
    this.right("Cobertura", this.font, 10);
    this.down(1.4);
    this.left(`DNI ${h.dni}`, 26);
    this.left(`Edad: ${h.age} años`, 112);
    this.left(`Fec. Nac.: ${h.birthDate}`, 181);
    this.right(h.coverageCode, this.font, 9);
    this.down(1.5);
    this.left(h.address);
    this.down(0.9);
    this.right(`(${h.plan})`, this.font, 9);
    this.down(1.1);
    this.left(`Tel ${h.phone} - Cel ${h.mobile} - ${h.email}`);
    this.down(0.8);
    this.right(h.memberNumber, this.font, 9);
    this.down(2.2);
  }

  wrap(text: string, maxWidth = RIGHT - LEFT - 10): string[] {
    const out: string[] = [];
    for (const paragraph of text.split("\n")) {
      if (paragraph.trim() === "") {
        out.push("");
        continue;
      }
      let line = "";
      for (const word of paragraph.split(" ")) {
        const candidate = line ? `${line} ${word}` : word;
        if (this.font.widthOfTextAtSize(candidate, SIZE) > maxWidth && line) {
          out.push(line);
          line = word;
        } else line = candidate;
      }
      out.push(line);
    }
    return out;
  }

  note(note: FixtureNote) {
    this.ensure(5);
    this.left(`${note.date} ${note.time}`, 27);
    this.left(`- ${this.fixture.header.age} años`, 117);
    this.right(note.author);
    this.down();
    this.right(note.specialty);
    this.down();
    this.right(`MP: ${note.mp}`);
    this.down(2);
    for (const line of this.wrap(note.text)) {
      this.ensure();
      if (line) this.left(line);
      this.down();
    }
    this.down(2);
  }
}

async function build(fixture: FixtureCase): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Historia clínica");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new Writer(doc, font, bold, fixture);
  if (fixture.leadingImagePages) for (let i = 0; i < fixture.leadingImagePages; i++) w.imagePage();
  w.newPage(true);
  for (const item of fixture.items) {
    if (item === "image-page") {
      w.imagePage();
      continue;
    }
    w.note(item);
  }
  return doc.save();
}

async function buildNoText(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 3; i++) {
    const page = doc.addPage([A4.width, A4.height]);
    page.drawRectangle({ x: 40, y: 80, width: 515, height: 700, color: rgb(0.9, 0.9, 0.9) });
  }
  return doc.save();
}

async function main() {
  mkdirSync("fixtures/exports", { recursive: true });
  for (const fixture of cases) {
    writeFileSync(`fixtures/exports/${fixture.file}`, await build(fixture));
    console.log(`wrote fixtures/exports/${fixture.file}`);
  }
  writeFileSync("fixtures/exports/sin-texto.pdf", await buildNoText());
  console.log("wrote fixtures/exports/sin-texto.pdf");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
