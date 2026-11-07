import { createOpenAI } from "@ai-sdk/openai";
import type { generateText, LanguageModel } from "ai";
import { env } from "@/lib/env";
import { limits } from "@/lib/limits";
import { mockLanguageModel } from "./mock";

// One provider instance per process. The mock model drives every automated
// test; the real model is selected only by AI_PROVIDER=openai.
export type ModelSetup = {
  model: LanguageModel;
  modelId: string;
  callOptions: {
    maxRetries: 0; // the browser drives the single permitted retry
    timeout: number;
    providerOptions: Parameters<typeof generateText>[0]["providerOptions"];
  };
};

let cached: ModelSetup | undefined;

export function modelSetup(): ModelSetup {
  if (cached) return cached;
  const e = env();
  const callOptions: ModelSetup["callOptions"] = {
    maxRetries: 0,
    timeout: limits.GENERATION_TIMEOUT_MS,
    providerOptions: { openai: { store: false, reasoningEffort: e.AI_REASONING_EFFORT, textVerbosity: "low" } },
  };
  if (e.AI_PROVIDER === "mock") {
    cached = { model: mockLanguageModel(), modelId: "mock", callOptions };
  } else {
    const openai = createOpenAI({ apiKey: e.OPENAI_API_KEY });
    cached = { model: openai(e.AI_MODEL), modelId: e.AI_MODEL, callOptions };
  }
  return cached;
}
