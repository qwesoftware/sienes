import { NextResponse } from "next/server";
import { ZodError } from "zod";

// Errors that carry a status and a Spanish message safe to show to the user.
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

// Wraps a route handler: known errors become JSON with their status, Zod
// failures become 400, anything else is logged without its body and answered
// with a generic 500 so no clinical or personal content leaks into a response.
export function handle<Ctx>(fn: (request: Request, ctx: Ctx) => Promise<Response>) {
  return async (request: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) return jsonError(err.status, err.message);
      if (err instanceof ZodError) return jsonError(400, "Datos inválidos");
      const status = typeof err === "object" && err && "status" in err ? err.status : undefined;
      if (status === 401 || status === "UNAUTHORIZED") return jsonError(401, "Sesión no válida");
      if (status === 403 || status === "FORBIDDEN") return jsonError(403, "Sin permiso");
      console.error("unhandled", err instanceof Error ? `${err.name}: ${err.message}` : "error");
      return jsonError(500, "Error interno");
    }
  };
}
