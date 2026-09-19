import { routeHandler, json, requireRole } from "@/lib/route";
import { listAllWithdrawals } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "admin");
    const withdrawals = await listAllWithdrawals();
    return json({ withdrawals });
  });
}