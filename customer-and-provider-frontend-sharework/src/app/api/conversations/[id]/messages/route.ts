import { routeHandler, json, requireAnyUser, notFound } from "@/lib/route";
import { sendMessage } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const body = await req.json().catch(() => ({}));
    const content = String(body.content ?? "").trim();
    if (!content || content.length > 2000) {
      return json({ error: { code: "BAD_REQUEST", message: "Message is required (1–2000 characters)." } }, { status: 400 });
    }
    const msg = await sendMessage(id, user!.sub, content);
    if (!msg) throw notFound("Conversation");
    return json({ ok: true, id: String(msg._id) });
  });
}