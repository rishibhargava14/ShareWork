import { routeHandler, json, requireRole } from "@/lib/route";
import { listProviderEarnings } from "@/lib/data";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const earnings = await listProviderEarnings(user!.sub);
    return json({ ...earnings, withdrawals: earnings.withdrawals.map((w) => ({ id: String(w._id), amount: w.amount, status: w.status, requestedAt: (w as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "" })) });
  });
}