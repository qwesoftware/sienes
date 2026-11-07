// Local evaluation on the real exports: runs both stages per file with the
// configured model and prints per-case counts, tokens, latency and cost,
// stopping when the budget is reached. With --drafts it also prints the
// generated drafts (allowed only in the owner's local environment during the
// build phase). Nothing is written to disk.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { modelSetup } from "@/ai/model";
import { costUsd, runCase } from "@/ai/run-case";
import type { Insurer } from "@/contracts/case";
import { parseMedexis } from "@/parser/medexis";
import { extractPagesNode } from "@/parser/pdf-node";

config({ path: ".env.dev" });

const args = process.argv.slice(2);
const showDrafts = args.includes("--drafts");
const dir = args.find((a) => a.startsWith("--dir="))?.slice(6) ?? "exports-medexis";
const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8) ?? 999);
const budget = Number(args.find((a) => a.startsWith("--budget="))?.slice(9) ?? 3);

function insurerOf(coverage: string | null): Insurer {
  const c = (coverage ?? "").toLowerCase();
  if (c.includes("osde")) return "osde";
  if (c.includes("swiss")) return "swiss-medical";
  if (c.includes("union") || c.includes("unión")) return "union-personal";
  if (c.includes("ostvla")) return "ostvla";
  return "pami";
}

async function main() {
  const setup = modelSetup();
  const files = readdirSync(dir).filter((f) => f.toLowerCase().endsWith(".pdf")).slice(0, limit);
  let spent = 0;
  let index = 0;
  for (const file of files) {
    index++;
    if (spent >= budget) {
      console.log(`budget of ${budget} USD reached; stopping before case ${index}`);
      break;
    }
    const parsed = parseMedexis(await extractPagesNode(new Uint8Array(readFileSync(join(dir, file)))));
    const insurer = insurerOf(parsed.header.coverageCode.value);
    try {
      const result = await runCase(parsed, insurer, setup);
      const s = result.stages;
      const inTok = (s.select.inputTokens ?? 0) + (s.generate.inputTokens ?? 0);
      const outTok = (s.select.outputTokens ?? 0) + (s.generate.outputTokens ?? 0);
      const cost = costUsd(inTok, outTok);
      spent += cost;
      console.log(
        `case ${index}: ${parsed.notes.length} notes, ${parsed.pageCount} pages, insurer ${insurer} · select ${s.select.ms} ms (${s.select.inputTokens}/${s.select.outputTokens}) · generate ${s.generate.ms} ms (${s.generate.inputTokens}/${s.generate.outputTokens}) · ${result.selection.specialties.length} specialties, ${result.draft.sections.length} sections, ${result.draft.alerts.length} alerts · ${cost.toFixed(4)} USD`,
      );
      if (showDrafts) console.log(JSON.stringify({ selection: result.selection, draft: result.draft }, null, 2));
    } catch (err) {
      console.log(`case ${index}: failed (${err instanceof Error ? err.name : "error"})`);
    }
  }
  console.log(`total estimated cost: ${spent.toFixed(4)} USD over ${index} cases`);
}

main().catch((err) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : err);
  process.exit(1);
});
