import { routeHandler, json, notFound, readJson, requireRole } from "@/lib/route";
import { getService, updateService, deleteService } from "@/lib/data";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(_req, async () => {
    const svc = await getService(id);
    if (!svc) throw notFound("Service");
    return json({ service: svc });
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const body = await readJson(req);
    const update: Record<string, unknown> = {};
    if (body.title != null) update.title = String(body.title).trim().slice(0, 120);
    if (body.description != null) update.description = String(body.description).trim().slice(0, 2000);
    if (body.category != null) update.category = body.category;
    if (body.price != null) update.price = Number(body.price);
    if (body.deliveryDays != null) update.deliveryDays = Number(body.deliveryDays);
    if (body.skills != null && Array.isArray(body.skills)) update.skills = (body.skills as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 10);
    if (body.tags != null && Array.isArray(body.tags)) update.tags = (body.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 10);
    if (body.active != null) update.active = !!body.active;
    if (Array.isArray(body.packages)) {
      update.packages = (body.packages as unknown[]).slice(0, 3).map((p) => {
        const pkg = p as Record<string, unknown>;
        return {
          name: String(pkg.name ?? "Package"),
          price: Number(pkg.price ?? 0),
          deliveryDays: Number(pkg.deliveryDays ?? 1),
          description: String(pkg.description ?? ""),
          features: Array.isArray(pkg.features)
            ? (pkg.features as unknown[]).filter((f): f is string => typeof f === "string").slice(0, 8)
            : [],
        };
      });
    }

    const ok = await updateService(id, user!.sub, update);
    if (!ok) throw notFound("Service");
    return json({ ok: true });
  });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const ok = await deleteService(id, user!.sub);
    if (!ok) throw notFound("Service");
    return json({ ok: true });
  });
}