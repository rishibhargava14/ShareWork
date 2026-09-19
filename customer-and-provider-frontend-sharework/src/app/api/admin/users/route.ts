import { routeHandler, json, requireRole } from "@/lib/route";
import { listAllUsers } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const url = new URL(req.url);
    const users = await listAllUsers({
      q: url.searchParams.get("q") ?? undefined,
      role: url.searchParams.get("role") ?? undefined,
    });
    return json({ users });
  });
}