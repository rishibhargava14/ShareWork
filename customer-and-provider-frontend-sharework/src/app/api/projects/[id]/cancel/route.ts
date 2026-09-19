import { routeHandler, json, requireAnyUser, badRequest } from "@/lib/route";
import { cancelProject } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    try {
      await cancelProject(id, user!.sub);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not cancel the project.");
    }
    return json({ ok: true });
  });
}