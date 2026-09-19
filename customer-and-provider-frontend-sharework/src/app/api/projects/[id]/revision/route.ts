import { routeHandler, json, requireAnyUser, readJson, badRequest } from "@/lib/route";
import { requestRevision } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const body = await readJson(req);
    const note = String(body.note ?? "").trim().slice(0, 2000);
    if (!note) throw badRequest("A revision note is required.", { note: "Required" });
    try {
      await requestRevision(id, user!.sub, note);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not request revisions.");
    }
    return json({ ok: true });
  });
}