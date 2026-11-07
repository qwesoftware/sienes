import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { mockLanguageModel, mockSelect } from "@/ai/mock";
import { runGenerate, validateDraft } from "@/ai/generate";
import type { GenerateRequest, SourceNote } from "@/contracts/ai";
import type { Draft } from "@/contracts/draft";

const sources: SourceNote[] = [
  { id: "n1", recordedDate: "2026-09-02", authorName: "A", authorSpecialtyLabel: "NEUROLOGIA", text: "Control neurológico. Dx: Secuela de ACV isquémico (I69.3). MH: Enalapril 10 mg/día. Se indica continuar kinesiología por 6 meses. Práctica 250101, módulo rehabilitación integral, cantidad 24.", pages: [1, 2] },
  { id: "n2", recordedDate: "2026-10-01", authorName: "D", authorSpecialtyLabel: "KINESIOLOGIA", text: "Sesión de kinesiología. Marcha con bastón. Berg 40/56.", pages: [3] },
];
const selection = mockSelect(sources);
const request: GenerateRequest = { attemptId: "g1", insurer: "pami", selection, sources };
const callOptions = { maxRetries: 0 as const, timeout: 1000, providerOptions: {} };

describe("generate run", () => {
  it("verifies its citations with check_references and returns a draft whose sections cite the sources", async () => {
    const model = mockLanguageModel();
    const result = await runGenerate(request, { model, modelId: "mock", callOptions });
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(model.doGenerateCalls[1].prompt.some((m) => m.role === "tool")).toBe(true);
    const keys = result.draft.sections.map((s) => s.key);
    expect(keys).toEqual(expect.arrayContaining(["reason", "diagnosis", "history", "medication", "assessments", "progress:neurologia", "progress:kinesiologia", "indication"]));
    expect(result.draft.diagnosis).toMatchObject({ cie10: "I69.3", references: [{ noteId: "n1", page: 1 }] });
    expect(result.draft.prestacion).toMatchObject({ practiceCode: "250101", quantity: 24 });
    expect(result.draft.alerts.filter((a) => a.code === "invalid-reference")).toHaveLength(0);
    expect(result.versions.modules).toHaveProperty("generate");
  });

  it("turns a dangling reference into an alert instead of a silent draft", async () => {
    const draft: Draft = {
      sections: [{ key: "reason", title: "Motivo", text: "Renovación.", references: [{ noteId: "ghost", page: 9 }] }],
      diagnosis: { text: null, cie10: null, references: [] },
      prestacion: { practiceCode: null, module: null, quantity: null, references: [] },
      alerts: [],
    };
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: "text", text: JSON.stringify(draft) }], finishReason: { unified: "stop", raw: undefined }, usage: { inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 0, text: 0, reasoning: 0 } }, warnings: [] }),
    });
    const result = await runGenerate(request, { model, modelId: "bad", callOptions });
    expect(result.draft.sections[0].references).toEqual([]);
    expect(result.draft.sections[0].text).toBe("Renovación.");
    expect(result.draft.alerts).toContainEqual(expect.objectContaining({ code: "invalid-reference", sectionKey: "reason", noteId: "ghost" }));
  });

  it("does not demand a reference for a section that only reports the absence of clinical content", () => {
    const draft: Draft = {
      sections: [{ key: "progress:psicologia", title: "Psicología", text: "Solo constan notas administrativas.", references: [] }],
      diagnosis: { text: null, cie10: null, references: [] },
      prestacion: { practiceCode: null, module: null, quantity: null, references: [] },
      alerts: [{ code: "no-clinical-content", message: "Sin contenido clínico.", sectionKey: "progress:psicologia", noteId: null }],
    };
    expect(validateDraft(draft, sources).alerts.map((a) => a.code)).toEqual(["no-clinical-content"]);
  });

  it("flags a prestación quantity that no cited source states", () => {
    const draft: Draft = {
      sections: [{ key: "reason", title: "Motivo", text: "", references: [] }],
      diagnosis: { text: null, cie10: null, references: [] },
      prestacion: { practiceCode: "250101", module: null, quantity: 72, references: [{ noteId: "n1", page: 1 }] },
      alerts: [],
    };
    const checked = validateDraft(draft, sources);
    expect(checked.alerts).toContainEqual(expect.objectContaining({ code: "numeric-mismatch", sectionKey: "prestacion" }));
    expect(validateDraft({ ...draft, prestacion: { ...draft.prestacion, quantity: 24 } }, sources).alerts).toEqual([]);
  });
});

describe("draft validation", () => {
  it("reports an uncited diagnosis once, not once per place it appears", () => {
    const draft: Draft = {
      sections: [{ key: "diagnosis", title: "Diagnóstico", text: "No consta diagnóstico.", references: [] }],
      diagnosis: { text: "No consta diagnóstico.", cie10: null, references: [] },
      prestacion: { practiceCode: null, module: null, quantity: null, references: [] },
      alerts: [],
    };
    const alerts = validateDraft(draft, sources).alerts.filter((a) => a.code === "invalid-reference");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].sectionKey).toBe("diagnosis");
  });
});
