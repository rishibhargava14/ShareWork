import { routeHandler, json, requireRole } from "@/lib/route";
import { listProjectsForUser } from "@/lib/data";
import { feeBreakdown } from "@/lib/constants";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "customer");
    const projects = await listProjectsForUser(user!.sub, "customer");
    const transactions = projects
      .filter((p) => p.escrow && (p.escrow.status === "funded" || p.escrow.status === "released"))
      .map((p) => {
        const amount = p.escrow!.amount;
        const fees = feeBreakdown(amount);
        return {
          id: p.id,
          title: p.title,
          provider: p.provider.name,
          status: p.escrow!.status,
          projectStatus: p.status,
          fundedAt: p.escrow!.fundedAt ?? p.createdAt,
          releasedAt: p.escrow!.releasedAt,
          ...fees,
        };
      });
    const totals = transactions.reduce(
      (acc, t) => ({
        gross: acc.gross + t.gross,
        platformFee: acc.platformFee + t.platformFee,
        gst: acc.gst + t.gst,
        netToProvider: acc.netToProvider + t.netToProvider,
      }),
      { gross: 0, platformFee: 0, gst: 0, netToProvider: 0 }
    );
    return json({ transactions, totals });
  });
}
