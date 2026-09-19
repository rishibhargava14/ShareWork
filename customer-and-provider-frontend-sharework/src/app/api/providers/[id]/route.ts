import { routeHandler, json, notFound } from "@/lib/route";
import { getProviderProfile } from "@/lib/data";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(_req, async () => {
    const profile = await getProviderProfile(id);
    if (!profile) throw notFound("Provider");
    return json({ provider: profile });
  });
}