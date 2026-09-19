import { connectDB } from "@/lib/db";
import { getSessionUser, type SessionPayload } from "@/lib/server-auth";
import type { Role } from "@/lib/constants";

export class HttpError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;

  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const unauthorized = () =>
  new HttpError(401, "UNAUTHORIZED", "You must be signed in to do this.");

export const forbidden = (message = "You don't have permission to do this.") =>
  new HttpError(403, "FORBIDDEN", message);

export const notFound = (label = "Resource") =>
  new HttpError(404, "NOT_FOUND", `${label} not found.`);

export const badRequest = (message: string, fields?: Record<string, string>) =>
  new HttpError(400, "BAD_REQUEST", message, fields);

export function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function requireRole(user: SessionPayload | null, role: Role): SessionPayload {
  if (!user) throw unauthorized();
  if (user.role !== role) throw forbidden();
  return user;
}

export function requireAnyUser(user: SessionPayload | null): SessionPayload {
  if (!user) throw unauthorized();
  return user;
}

/**
 * Wraps a route handler: connects MongoDB, resolves the session user, and maps
 * any HttpError or unexpected error to a consistent JSON error response.
 */
export async function routeHandler(
  req: Request,
  handler: (ctx: { req: Request; user: SessionPayload | null }) => Promise<Response>
): Promise<Response> {
  try {
    await connectDB();
    const user = await getSessionUser();
    return await handler({ req, user });
  } catch (err) {
    if (err instanceof HttpError) {
      return json({ error: { code: err.code, message: err.message, fields: err.fields } }, {
        status: err.status,
      });
    }
    console.error("[api] unhandled error", err);
    return json(
      { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
      { status: 500 }
    );
  }
}