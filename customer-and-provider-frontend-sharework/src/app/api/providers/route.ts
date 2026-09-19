import { routeHandler, json } from "@/lib/route";
import { listProviders } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async () => {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? undefined;
    const skill = url.searchParams.get("skill") ?? undefined;
    const providers = await listProviders({ q, skill });
    return json({ providers });
  });
}