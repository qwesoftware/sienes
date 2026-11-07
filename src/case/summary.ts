import type { CaseRecord } from "./types";

// The reviewed cases a batch ZIP holds, and the rest.
export function zipPartition(cases: CaseRecord[]) {
  const included = cases.filter((c) => c.draft && c.header && c.insurer && c.reviewedRevision === c.revision);
  const excluded = cases.filter((c) => !included.includes(c));
  return { included, excluded };
}

// What "Finalizar y limpiar" would throw away: reviewed cases not downloaded
// at their current revision and cases the reviewer corrected.
export function clearSummary(cases: CaseRecord[]) {
  const reviewedNotDownloaded = cases.filter((c) => c.reviewedRevision === c.revision && c.downloadedRevision !== c.revision).length;
  const corrected = cases.filter((c) => Object.keys(c.edits).length > 0 || Object.values(c.header ?? {}).some((f) => typeof f === "object" && f.status === "corrected")).length;
  return { total: cases.length, reviewedNotDownloaded, corrected, wouldLose: corrected > 0 || cases.some((c) => c.draft !== null) };
}

// The next case after `currentId` in list order that still needs work, wrapping around.
export function nextPendingId(cases: CaseRecord[], currentId: string | null): string | null {
  const start = cases.findIndex((c) => c.id === currentId);
  for (let i = 1; i < cases.length + (start === -1 ? 1 : 0); i++) {
    const c = cases[(start + i + cases.length) % cases.length];
    if (c.state !== "reviewed" && c.state !== "error") return c.id;
  }
  return null;
}
