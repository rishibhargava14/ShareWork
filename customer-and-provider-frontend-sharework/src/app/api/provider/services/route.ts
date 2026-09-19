import { routeHandler, json, requireRole } from "@/lib/route";
import { listProviderServices } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const services = await listProviderServices(user!.sub);
    return json({ services });
  });
}