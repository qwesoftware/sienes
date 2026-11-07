import { APICallError, NoObjectGeneratedError } from "ai";
import type { ErrorCategory } from "@/contracts/telemetry";
import { HttpError } from "@/lib/http";

export class InvalidAiResponse extends Error {}

// Classifies a failed model call for telemetry without keeping its message.
export function categorize(err: unknown): ErrorCategory {
  if (err instanceof InvalidAiResponse) return "invalid-reference";
  if (NoObjectGeneratedError.isInstance(err)) return "schema";
  if (APICallError.isInstance(err)) return "provider";
  if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) return "timeout";
  return "unknown";
}

// Turns a failed model call into a response. Provider messages are never
// forwarded: they can echo the prompt, which carries clinical text.
export function toHttpError(err: unknown): HttpError {
  switch (categorize(err)) {
    case "invalid-reference":
    case "schema":
      return new HttpError(502, "El modelo devolvió una respuesta inválida. Podés intentar de nuevo.");
    case "provider":
      return new HttpError(502, "El proveedor de IA no respondió correctamente. Podés intentar de nuevo.");
    case "timeout":
      return new HttpError(504, "El análisis tardó más de lo permitido. Podés intentar de nuevo.");
    default:
      return new HttpError(500, "Error interno");
  }
}
