import { describe, expect, it } from "vitest";
import { proposeInsurer } from "@/case/insurer";
import { clearSummary, nextPendingId } from "@/case/summary";
import { newCase, type CaseRecord } from "@/case/types";
import type { Draft } from "@/contracts/draft";
import { plural } from "@/lib/format";

const draft: Draft = {
  sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [] }],
  diagnosis: { text: "ACV", cie10: null, references: [] },
  prestacion: { practiceCode: null, module: null, quantity: 24, references: [] },
  alerts: [],
};
const field = (status: "extracted" | "corrected") => ({ value: "x", status });
const header = (status: "extracted" | "corrected"): NonNullable<CaseRecord["header"]> => ({
  patientName: field("extracted"),
  documentNumber: field("extracted"),
  birthDate: field("extracted"),
  age: field("extracted"),
  coverageCode: field("extracted"),
  plan: field("extracted"),
  memberNumber: field(status),
  cud: "unknown",
});
const make = (id: string, patch: Partial<CaseRecord>): CaseRecord => ({ ...newCase(id, `${id}.pdf`), ...patch });

describe("clear summary", () => {
  it("has nothing to lose when no case holds a draft or a correction", () => {
    expect(clearSummary([make("a", { header: header("extracted") }), make("b", {})])).toEqual({ total: 2, reviewedNotDownloaded: 0, corrected: 0, wouldLose: false });
  });

  it("counts reviewed cases not downloaded at their current revision and cases with corrections", () => {
    const cases = [
      make("reviewed", { draft, revision: 3, reviewedRevision: 3, downloadedRevision: null }),
      make("downloaded", { draft, revision: 3, reviewedRevision: 3, downloadedRevision: 3 }),
      make("downloaded-then-edited", { draft, revision: 4, reviewedRevision: 4, downloadedRevision: 3, edits: { reason: { change: "modification", reason: null } } }),
      make("header-corrected", { header: header("corrected") }),
    ];
    expect(clearSummary(cases)).toEqual({ total: 4, reviewedNotDownloaded: 2, corrected: 2, wouldLose: true });
  });

  it("would lose an unreviewed draft even without corrections", () => {
    expect(clearSummary([make("a", { draft })]).wouldLose).toBe(true);
  });
});

describe("next pending case", () => {
  const cases = [make("a", { state: "reviewed" }), make("b", { state: "error" }), make("c", { state: "draft" }), make("d", { state: "reviewed" })];

  it("picks the next case in list order that is neither reviewed nor in error, wrapping around", () => {
    expect(nextPendingId(cases, "d")).toBe("c");
    expect(nextPendingId([...cases, make("e", { state: "ready-to-analyze" })], "c")).toBe("e");
  });

  it("returns null when no other case is pending", () => {
    expect(nextPendingId(cases, "c")).toBeNull();
    expect(nextPendingId([make("a", { state: "reviewed" })], "a")).toBeNull();
  });
});

describe("insurer proposed from the coverage", () => {
  it("recognizes each insurer in the printed coverage, ignoring case and accents", () => {
    expect(proposeInsurer("41-PAMI")).toBe("pami");
    expect(proposeInsurer("390-OSDE")).toBe("osde");
    expect(proposeInsurer("120-Swiss Medical")).toBe("swiss-medical");
    expect(proposeInsurer("77-UNION PERSONAL")).toBe("union-personal");
    expect(proposeInsurer("77-Unión Personal")).toBe("union-personal");
    expect(proposeInsurer("15-ostvla")).toBe("ostvla");
  });

  it("proposes nothing for an unknown or missing coverage", () => {
    expect(proposeInsurer("500-IOMA")).toBeNull();
    expect(proposeInsurer(null)).toBeNull();
  });
});

describe("plural", () => {
  it("joins the count with the singular or plural form", () => {
    expect(plural(1, "nota", "notas")).toBe("1 nota");
    expect(plural(0, "nota", "notas")).toBe("0 notas");
    expect(plural(3, "página escaneada ignorada", "páginas escaneadas ignoradas")).toBe("3 páginas escaneadas ignoradas");
  });
});
