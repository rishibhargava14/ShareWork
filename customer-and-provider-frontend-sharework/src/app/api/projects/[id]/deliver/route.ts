import { routeHandler, json, requireAnyUser, readJson, badRequest } from "@/lib/route";
import { submitDelivery } from "@/lib/data";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const body = await readJson(req);
    const message = String(body.message ?? "").trim().slice(0, 5000);
    if (!message) throw badRequest("Delivery message is required.", { message: "Required" });
    try {
      await submitDelivery(id, user!.sub, message);
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not submit delivery.");
    }
    return json({ ok: true });
  });
}