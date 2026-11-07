import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { InvalidAiResponse } from "@/ai/errors";
import { mockLanguageModel } from "@/ai/mock";
import { runSelect } from "@/ai/select";
import type { SelectRequest, SourceNote } from "@/contracts/ai";

const notes: SourceNote[] = [
  { id: "n1", recordedDate: "2026-09-02", authorName: "A", authorSpecialtyLabel: "NEUROLOGIA", text: "Control neurológico. Dx: Secuela de ACV (I69.3). MH: Enalapril 10 mg/día.", pages: [1] },
  { id: "n2", recordedDate: "2026-09-10", authorName: "B", authorSpecialtyLabel: "PSICOLOGIA", text: "Sesión de kinesiología motora. Marcha en paralelas.", pages: [2] },
  { id: "n3", recordedDate: "2026-09-12", authorName: "C", authorSpecialtyLabel: "ADMINISTRACION", text: "Paciente ausente. Se reprograma.", pages: [2] },
  { id: "n4", recordedDate: "2026-10-01", authorName: "D", authorSpecialtyLabel: "KINESIOLOGIA", text: "Sesión de kinesiología. Berg 40/56.", pages: [3] },
];

const request: SelectRequest = { attemptId: "a1", insurer: "osde", notes };
const callOptions = { maxRetries: 0 as const, timeout: 1000, providerOptions: {} };

describe("select run", () => {
  it("flags a note whose content contradicts its author label and excludes administrative notes", async () => {
    const result = await runSelect(request, { model: mockLanguageModel(), modelId: "mock", callOptions });
    const kine = result.selection.specialties.find((s) => s.specialtyKey === "kinesiologia");
    expect(kine).toBeDefined();
    expect(kine!.primaryNoteId).toBe("n4");
    expect(kine!.supportingNoteIds).toEqual(["n2"]);
    expect(kine!.labelOverride).toBe(true);
    expect(kine!.flags).toContainEqual(expect.objectContaining({ code: "label-override", noteId: "n2" }));
    expect(result.selection.excludedNoteIds.map((e) => e.noteId)).toEqual(["n3"]);
    expect(result.selection.diagnosisNoteIds).toEqual(["n1"]);
    expect(result.selection.medicationNoteIds).toEqual(["n1"]);
    expect(result.versions).toEqual({ model: "mock", modules: expect.objectContaining({ core: expect.any(String), "insurer/osde": expect.any(String) }) });
  });

  it("rejects a response that cites a note the case does not have", async () => {
    const bad = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: "text", text: JSON.stringify({ specialties: [{ specialtyKey: "neurologia", specialtyLabel: "Neurología", primaryNoteId: "ghost", primaryKind: "report", supportingNoteIds: [], labelOverride: false, flags: [] }], diagnosisNoteIds: [], historyNoteIds: [], medicationNoteIds: [], excludedNoteIds: [] }) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 0, text: 0, reasoning: 0 } },
        warnings: [],
      }),
    });
    await expect(runSelect(request, { model: bad, modelId: "bad", callOptions })).rejects.toBeInstanceOf(InvalidAiResponse);
  });

  it("sends the notes without any header field", async () => {
    const model = mockLanguageModel();
    await runSelect(request, { model, modelId: "mock", callOptions });
    const sent = JSON.stringify(model.doGenerateCalls[0].prompt);
    expect(sent).toContain("Sesión de kinesiología motora");
    expect(sent).not.toMatch(/patientName|documentNumber|memberNumber/);
  });
});
