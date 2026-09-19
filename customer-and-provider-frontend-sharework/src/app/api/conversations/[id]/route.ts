import { routeHandler, json, requireAnyUser, notFound } from "@/lib/route";
import { getConversationView, listMessages } from "@/lib/data";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(_req, async ({ user }) => {
    requireAnyUser(user);
    const conv = await getConversationView(id, user!.sub);
    if (!conv) throw notFound("Conversation");
    const messages = (await listMessages(id, user!.sub)) ?? [];
    return json({ conversation: conv, messages });
  });
}