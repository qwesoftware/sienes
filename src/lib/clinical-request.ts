import { HttpError } from "@/lib/http";
import { limits } from "@/lib/limits";

// Reads a clinical request body under the configured size and text limits.
// Oversized input is rejected with an explanation; it is never trimmed.
export async function readClinicalBody(request: Request, textOf: (body: unknown) => unknown): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > limits.REQUEST_MAX_BYTES) throw tooLarge();
  const raw = await request.text();
  if (raw.length > limits.REQUEST_MAX_BYTES) throw tooLarge();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Datos inválidos");
  }
  const chars = JSON.stringify(textOf(body) ?? "").length;
  if (chars > limits.AI_MAX_INPUT_CHARS) {
    throw new HttpError(413, "La historia supera el máximo que se puede analizar. Exportá un período más corto desde Medexis.");
  }
  return body;
}

function tooLarge() {
  return new HttpError(413, "La historia supera el máximo que se puede analizar. Exportá un período más corto desde Medexis.");
}
