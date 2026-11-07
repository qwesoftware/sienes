import { describe, expect, it } from "vitest";
import { draftSchema, findReferenceIssues, type Draft } from "@/contracts/draft";

const sources = [
  { id: "n1", pages: [1, 2] },
  { id: "n2", pages: [3] },
];

const base: Draft = {
  sections: [
    { key: "reason", title: "Motivo", text: "Renovación.", references: [{ noteId: "n1", page: 1 }] },
    { key: "progress:neurologia", title: "Neurología", text: "Evoluciona.", references: [{ noteId: "n2", page: 3 }] },
    { key: "assessments", title: "Estudios", text: "", references: [] },
  ],
  diagnosis: { text: "Secuela de ACV", cie10: "I69.3", references: [{ noteId: "n1", page: 2 }] },
  prestacion: { practiceCode: null, module: null, quantity: null, references: [] },
  alerts: [],
};

describe("draft contract", () => {
  it("accepts a draft whose references all point at sources", () => {
    expect(draftSchema.parse(base)).toBeTruthy();
    expect(findReferenceIssues(base, sources)).toEqual([]);
  });

  it("flags a reference to a note that does not exist or to a page outside the note", () => {
    const draft: Draft = {
      ...base,
      sections: [
        { ...base.sections[0], references: [{ noteId: "n9", page: 1 }] },
        { ...base.sections[1], references: [{ noteId: "n2", page: 1 }] },
      ],
    };
    expect(findReferenceIssues(draft, sources)).toEqual([
      { where: "reason", reference: { noteId: "n9", page: 1 }, reason: "unknown-note" },
      { where: "progress:neurologia", reference: { noteId: "n2", page: 1 }, reason: "page-outside-note" },
    ]);
  });

  it("requires a reference for every clinical statement, including a proposed prestación", () => {
    const draft: Draft = {
      ...base,
      sections: [{ ...base.sections[0], references: [] }],
      prestacion: { practiceCode: "250101", module: null, quantity: 24, references: [] },
    };
    expect(findReferenceIssues(draft, sources).map((i) => `${i.where}:${i.reason}`)).toEqual([
      "reason:missing-reference",
      "prestacion:missing-reference",
    ]);
  });

  it("rejects a section key outside the PAMI structure", () => {
    expect(draftSchema.safeParse({ ...base, sections: [{ key: "random", title: "x", text: "", references: [] }] }).success).toBe(false);
  });
});
