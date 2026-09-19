import { routeHandler, json, requireRole, readJson } from "@/lib/route";
import { patchAdminService } from "@/lib/data";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const body = await readJson(req);
    await patchAdminService(id, { active: !!body.active });
    return json({ ok: true });
  });
}