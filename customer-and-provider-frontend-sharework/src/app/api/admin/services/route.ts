import { routeHandler, json, requireRole } from "@/lib/route";
import { listAllServicesAdmin } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const services = await listAllServicesAdmin();
    return json({ services });
  });
}