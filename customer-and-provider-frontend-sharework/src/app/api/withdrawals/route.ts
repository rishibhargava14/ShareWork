import { routeHandler, json, requireRole, readJson, badRequest } from "@/lib/route";
import { listWithdrawals, requestWithdrawal } from "@/lib/data";
import { validatePrice, validateRequired, collect } from "@/lib/validation";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const withdrawals = await listWithdrawals(user!.sub);
    return json({ withdrawals });
  });
}

export async function POST(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const body = await readJson(req);
    const errors = collect([
      { field: "amount", message: validatePrice(body.amount) },
      { field: "payoutMethod", message: validateRequired(body.payoutMethod, "Payout method") },
    ]);
    if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors as Record<string, string>);

    try {
      const wd = await requestWithdrawal(user!.sub, Number(body.amount), String(body.payoutMethod));
      return json({ withdrawal: { id: String(wd._id), status: wd.status } });
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not request a withdrawal.");
    }
  });
}