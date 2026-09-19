import { routeHandler, json, requireRole, readJson, badRequest } from "@/lib/route";
import { patchAdminUser } from "@/lib/data";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const body = await readJson(req);
    if (body.status !== "active" && body.status !== "suspended") {
      throw badRequest("Invalid status.", { status: "active or suspended" });
    }
    await patchAdminUser(id, { status: body.status });
    return json({ ok: true });
  });
}