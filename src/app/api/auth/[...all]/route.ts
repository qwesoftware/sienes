import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

// The browser only signs in, signs out and reads its session. Every other
// Better Auth endpoint (admin operations, user updates, session listing) is
// reached server-side through `auth.api` from the app's own routes, which add
// their rules (not yourself, not the last admin); over HTTP they answer 404.
const allowed = new Set(["/sign-in/email", "/sign-out", "/get-session"]);
const handler = toNextJsHandler(auth);

function guard(method: "GET" | "POST") {
  return (request: Request): Promise<Response> => {
    const path = new URL(request.url).pathname.replace(/^\/api\/auth/, "");
    if (!allowed.has(path)) return Promise.resolve(new Response(null, { status: 404 }));
    return handler[method](request);
  };
}

export const GET = guard("GET");
export const POST = guard("POST");
