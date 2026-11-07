import { describe, expect, it } from "vitest";
import { groupIntoLines } from "@/parser/lines";

const item = (str: string, x: number, y: number, width = str.length * 4, height = 8) => ({ str, x, y, width, height });

describe("groupIntoLines", () => {
  it("joins items on the same baseline within tolerance and keeps columns apart", () => {
    const lines = groupIntoLines([
      item("DNI 11222333", 26, 731),
      item("Edad: 71 años", 112, 731),
      item("Fec. Nac.: 03/05/1955", 181, 730),
      item("390-OSDE", 420, 729),
      item("PEREYRA, MARTA", 25, 745),
    ]);
    expect(lines.map((l) => l.text)).toEqual(["PEREYRA, MARTA", "DNI 11222333  Edad: 71 años  Fec. Nac.: 03/05/1955  390-OSDE"]);
    expect(lines[1].segments.map((s) => s.x)).toEqual([26, 112, 181, 420]);
  });

  it("merges adjacent fragments of one word run into a single segment", () => {
    const [line] = groupIntoLines([item("Eva", 25, 500, 12), item("luación", 37, 500, 28)]);
    expect(line.segments).toHaveLength(1);
    expect(line.text).toBe("Evaluación");
  });

  it("drops whitespace-only items", () => {
    expect(groupIntoLines([item("   ", 10, 10)])).toEqual([]);
  });
});
