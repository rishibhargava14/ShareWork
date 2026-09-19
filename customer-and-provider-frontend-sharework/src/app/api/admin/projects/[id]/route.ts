import { routeHandler, json, requireRole, readJson, badRequest } from "@/lib/route";
import { adminSetProjectStatus } from "@/lib/data";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const body = await readJson(req);
    if (body.status !== "CANCELLED" && body.status !== "COMPLETED") {
      throw badRequest("Invalid status.", { status: "CANCELLED or COMPLETED" });
    }
    try {
      await adminSetProjectStatus(id, body.status);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not close the project.");
    }
    return json({ ok: true });
  });
}