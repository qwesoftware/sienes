// Runs Select and Generate with the configured model on a synthetic fixture
// and prints the result, tokens, latency and estimated cost. Synthetic data
// only, so the output may be read freely.
import { readFileSync } from "node:fs";
import { config } from "dotenv";
import { draftSchema } from "@/contracts/draft";
import { parseMedexis } from "@/parser/medexis";
import { extractPagesNode } from "@/parser/pdf-node";

// Limits are read at module load, so the env file must be loaded before the AI modules.
config({ path: ".env.dev" });

async function main() {
  const { modelSetup } = await import("@/ai/model");
  const { costUsd, runCase } = await import("@/ai/run-case");
  const file = process.argv[2] ?? "fixtures/exports/caso-a-renovacion-osde.pdf";
  const insurer = (process.argv[3] ?? "osde") as "osde";
  const setup = modelSetup();
  console.log(`model: ${setup.modelId} · file: ${file} · insurer: ${insurer}`);
  const parsed = parseMedexis(await extractPagesNode(new Uint8Array(readFileSync(file))));
  const result = await runCase(parsed, insurer, setup);
  draftSchema.parse(result.draft);
  console.log(JSON.stringify({ selection: result.selection, draft: result.draft }, null, 2));
  const s = result.stages;
  const inTok = (s.select.inputTokens ?? 0) + (s.generate.inputTokens ?? 0);
  const outTok = (s.select.outputTokens ?? 0) + (s.generate.outputTokens ?? 0);
  console.log(`select: ${s.select.ms} ms, ${s.select.inputTokens} in / ${s.select.outputTokens} out`);
  console.log(`generate: ${s.generate.ms} ms, ${s.generate.inputTokens} in / ${s.generate.outputTokens} out`);
  console.log(`total: ${inTok} in / ${outTok} out · estimated ${costUsd(inTok, outTok).toFixed(4)} USD · versions ${JSON.stringify(result.versions)}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
