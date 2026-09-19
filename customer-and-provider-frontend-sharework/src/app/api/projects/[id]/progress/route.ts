import { routeHandler, json, requireAnyUser, badRequest } from "@/lib/route";
import { markInProgress, loadProjectView } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    try {
      await markInProgress(id, user!.sub);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not mark in progress.");
    }
    const view = await loadProjectView(id);
    return json({ ok: true, project: view });
  });
}
