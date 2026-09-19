import { routeHandler, json, requireAnyUser, badRequest } from "@/lib/route";
import { acceptAgreement, rejectAgreement, loadProjectView } from "@/lib/data";

type AgreementAction = "accept" | "reject";

function handle(action: AgreementAction) {
  return async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params;
    return routeHandler(req, async ({ user }) => {
      requireAnyUser(user);
      try {
        if (action === "accept") await acceptAgreement(id, user!.sub);
        else await rejectAgreement(id, user!.sub);
      } catch (e) {
        throw badRequest(e instanceof Error ? e.message : "Could not update the agreement.");
      }
      const view = await loadProjectView(id);
      return json({ ok: true, project: view });
    });
  };
}

export const POST = handle("accept");
export const PUT = handle("reject");