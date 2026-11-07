import { readFileSync } from "node:fs";
import path from "node:path";
import type { Insurer } from "@/contracts/case";

// Prompt modules live in `prompts/` as Markdown with a `version:` front
// matter line. The app composes them per task and insurer; the versions of
// every module used are recorded with each result (ADR-0001).

export type AiTask = "select" | "generate";

export type ComposedModules = {
  instructions: string;
  versions: Record<string, string>; // module name -> version
};

const root = path.join(process.cwd(), "prompts");
const cache = new Map<string, { version: string; body: string }>();

function loadModule(name: string): { version: string; body: string } {
  const cached = cache.get(name);
  if (cached) return cached;
  const raw = readFileSync(path.join(root, `${name}.md`), "utf8");
  const match = /^---\n(?:.*\n)*?version:\s*(\S+)\n(?:.*\n)*?---\n/.exec(raw);
  if (!match) throw new Error(`Prompt module ${name} has no version front matter`);
  const entry = { version: match[1], body: raw.slice(match[0].length).trim() };
  cache.set(name, entry);
  return entry;
}

// PAMI is the general module; other insurers add a thin override after it.
export function moduleNames(task: AiTask, insurer: Insurer): string[] {
  const names = ["core", task, "insurer/pami"];
  if (insurer !== "pami") names.push(`insurer/${insurer}`);
  return names;
}

export function composeModules(task: AiTask, insurer: Insurer): ComposedModules {
  const versions: Record<string, string> = {};
  const parts: string[] = [];
  for (const name of moduleNames(task, insurer)) {
    const { version, body } = loadModule(name);
    versions[name] = version;
    parts.push(body);
  }
  return { instructions: parts.join("\n\n"), versions };
}
