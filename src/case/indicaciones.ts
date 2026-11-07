import type { Draft } from "@/contracts/draft";

// The text the reviewer pastes into the portal's Indicaciones field: the
// RHC sections and the progress per specialty, in order, titled, skipping
// empty sections and any text already included (master document: "without
// repeating the same text"). Never truncated; the UI shows the length.
export function indicacionesText(draft: Draft): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const section of draft.sections) {
    const text = section.text.trim();
    if (text === "" || seen.has(text)) continue;
    seen.add(text);
    parts.push(`${section.title}: ${text}`);
  }
  return parts.join("\n\n");
}
