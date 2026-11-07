import { randomUUID } from "node:crypto";
import { createRunner, type Transport } from "@/case/runner";
import { newCase, type CaseRecord } from "@/case/types";
import type { Selection } from "@/contracts/ai";
import type { Insurer, ParsedExport } from "@/contracts/case";
import type { Draft } from "@/contracts/draft";
import type { ModelSetup } from "./model";
import { runGenerate } from "./generate";
import { runSelect } from "./select";

type Usage = { inputTokens: number | null; outputTokens: number | null };

// Runs both stages on a parsed export through the same case runner as the
// browser, with an in-process transport instead of HTTP. Used by the smoke
// and local evaluation scripts; never by the server.
export async function runCase(parsed: ParsedExport, insurer: Insurer, setup: ModelSetup) {
  const usage: { select?: Usage & { ms: number }; generate?: Usage & { ms: number } } = {};
  const transport: Transport = {
    select: async (body) => {
      const t0 = Date.now();
      const result = await runSelect(body, setup);
      usage.select = { ms: Date.now() - t0, ...result.usage };
      return { attemptId: body.attemptId, selection: result.selection, versions: result.versions };
    },
    generate: async (body) => {
      const t0 = Date.now();
      const result = await runGenerate(body, setup);
      usage.generate = { ms: Date.now() - t0, ...result.usage };
      return { attemptId: body.attemptId, draft: result.draft, versions: result.versions };
    },
    feedback: async () => {
      throw new Error("feedback is not stored by the scripts");
    },
  };
  let selection: Selection | undefined;
  let draft: Draft | undefined;
  let versions: CaseRecord["versions"] = null;
  let failure: string | undefined;
  const runner = createRunner({
    transport,
    retries: 0,
    newId: randomUUID,
    emit: (action) => {
      if (action.type === "analyzed") selection = action.selection;
      if (action.type === "generated") ({ draft, versions } = action);
      if (action.type === "analyze-failed" || action.type === "generate-failed") failure = action.message;
    },
  });
  await runner.runPending({ ...newCase(randomUUID(), "export"), parsed, header: parsed.header, headerConfirmed: true, insurer });
  if (!selection || !draft || !versions || !usage.select || !usage.generate) throw new Error(failure ?? "the run produced no draft");
  return { selection, draft, versions, stages: { select: usage.select, generate: usage.generate } };
}

// Reported list price for gpt-6-luna (USD per million tokens); override
// through AI_PRICE_INPUT_PER_M and AI_PRICE_OUTPUT_PER_M.
export function costUsd(inputTokens: number, outputTokens: number): number {
  const input = Number(process.env.AI_PRICE_INPUT_PER_M ?? 0.1);
  const output = Number(process.env.AI_PRICE_OUTPUT_PER_M ?? 0.5);
  return (inputTokens * input + outputTokens * output) / 1_000_000;
}
