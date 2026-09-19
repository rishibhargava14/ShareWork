import { routeHandler, json, badRequest, readJson } from "@/lib/route";
import { searchServices } from "@/lib/data";
import { requireRole } from "@/lib/route";
import Service from "@/models/Service";
import { CATEGORIES } from "@/lib/constants";
import { collect, validateRequired, validatePrice, validatePositiveInt, validateLength } from "@/lib/validation";

export async function GET(req: Request) {
  return routeHandler(req, async () => {
    const url = new URL(req.url);
    const services = await searchServices({
      q: url.searchParams.get("q") ?? undefined,
      category: url.searchParams.get("category") ?? undefined,
      minPrice: url.searchParams.has("minPrice") ? Number(url.searchParams.get("minPrice")) : undefined,
      maxPrice: url.searchParams.has("maxPrice") ? Number(url.searchParams.get("maxPrice")) : undefined,
      minRating: url.searchParams.has("minRating") ? Number(url.searchParams.get("minRating")) : undefined,
      onlineNow: url.searchParams.get("onlineNow") === "1",
      sort: url.searchParams.get("sort") ?? undefined,
    });
    return json({ services });
  });
}

export async function POST(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireRole(user, "provider");
    const body = await readJson(req);
    const errors = collect([
      { field: "title", message: validateLength(body.title, "Title", 120) ?? validateRequired(body.title, "Title") },
      { field: "description", message: validateRequired(body.description, "Description") ?? validateLength(body.description, "Description", 2000) },
      { field: "category", message: CATEGORIES.includes(String(body.category) as typeof CATEGORIES[number]) ? null : "Select a valid category." },
      { field: "price", message: validatePrice(body.price) },
      { field: "deliveryDays", message: validatePositiveInt(body.deliveryDays, "Delivery days") },
    ]);
    if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors as Record<string, string>);

    const skills = Array.isArray(body.skills)
      ? (body.skills as unknown[]).filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 10)
      : [];
    const tags = Array.isArray(body.tags)
      ? (body.tags as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 10)
      : [];

    const packages = Array.isArray(body.packages)
      ? (body.packages as unknown[])
          .slice(0, 3)
          .map((p) => {
            const pkg = p as Record<string, unknown>;
            return {
              name: String(pkg.name ?? "Package"),
              price: Number(pkg.price ?? 0),
              deliveryDays: Number(pkg.deliveryDays ?? 1),
              description: String(pkg.description ?? ""),
              features: Array.isArray(pkg.features)
                ? (pkg.features as unknown[]).filter((f): f is string => typeof f === "string" && f.trim().length > 0).slice(0, 8)
                : [],
            };
          })
      : [];

    const service = await Service.create({
      provider: user!.sub,
      title: String(body.title).trim(),
      description: String(body.description).trim(),
      category: body.category,
      skills,
      tags,
      price: Number(body.price),
      deliveryDays: Number(body.deliveryDays),
      active: true,
      packages,
    });

    return json({ service: { id: String(service._id) } }, { status: 201 });
  });
}