import { routeHandler, json, requireAnyUser, badRequest } from "@/lib/route";
import { approveDelivery } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    try {
      await approveDelivery(id, user!.sub);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not approve the delivery.");
    }
    return json({ ok: true });
  });
}