import { routeHandler, json, requireAnyUser } from "@/lib/route";
import { markConversationRead } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    await markConversationRead(id, user!.sub);
    return json({ ok: true });
  });
}