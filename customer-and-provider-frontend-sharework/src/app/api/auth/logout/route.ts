import { routeHandler, json } from "@/lib/route";
import { clearSessionCookie } from "@/lib/server-auth";

export async function POST(req: Request) {
  return routeHandler(req, async () => {
    await clearSessionCookie();
    return json({ ok: true });
  });
}