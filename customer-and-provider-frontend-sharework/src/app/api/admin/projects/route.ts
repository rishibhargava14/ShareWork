import { routeHandler, json, requireRole } from "@/lib/route";
import { listAllProjectsAdmin } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? undefined;
    const projects = await listAllProjectsAdmin(status);
    return json({ projects });
  });
}