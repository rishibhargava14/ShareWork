import { routeHandler, json, requireAnyUser, notFound } from "@/lib/route";
import { loadProjectView } from "@/lib/data";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(_req, async ({ user }) => {
    requireAnyUser(user);
    const view = await loadProjectView(id);
    if (!view) throw notFound("Project");
    const isParticipant = view.customer.id === user!.sub || view.provider.id === user!.sub || user!.role === "admin";
    if (!isParticipant) throw notFound("Project");
    const isCustomer = view.customer.id === user!.sub;
    const isProvider = view.provider.id === user!.sub;
    return json({ project: view, mine: { isCustomer, isProvider } });
  });
}