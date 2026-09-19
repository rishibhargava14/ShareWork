import { routeHandler, json, requireRole } from "@/lib/route";
import { patchWithdrawal } from "@/lib/data";
import { readJson, badRequest } from "@/lib/route";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const body = await readJson(req);
    const ok = await patchWithdrawal(id, String(body.status ?? ""));
    if (!ok) throw badRequest("Invalid withdrawal status.", { status: "processing, completed or failed" });
    return json({ ok: true });
  });
}