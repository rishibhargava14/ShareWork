import User, { toPublicUser } from "@/models/User";
import { routeHandler, readJson, json, badRequest, requireAnyUser } from "@/lib/route";
import { validateName, validatePhone, collect } from "@/lib/validation";
import { setSessionCookie } from "@/lib/server-auth";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const db = await User.findById(user!.sub).lean();
    if (!db) throw badRequest("User not found.");
    return json({ profile: toPublicUser(db) });
  });
}

export async function PUT(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const body = await readJson(req);
    const roleOnly = (body.role === "customer" || body.role === "provider") && body.name === undefined && body.phone === undefined;

    const errors = roleOnly
      ? {}
      : collect([
          { field: "name", message: validateName(body.name ?? user!.name) },
          { field: "phone", message: body.phone === undefined || body.phone === "" ? null : validatePhone(body.phone) },
        ]);
    if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors as Record<string, string>);

    const patch: Record<string, unknown> = {};
    if (!roleOnly) {
      patch.name = String(body.name ?? user!.name).trim();
      if (body.phone !== undefined) patch.phone = String(body.phone ?? "").trim();
      if (typeof body.title === "string") patch.title = body.title.trim().slice(0, 80);
      if (typeof body.bio === "string") patch.bio = body.bio.trim().slice(0, 1000);
      if (typeof body.location === "string") patch.location = body.location.trim().slice(0, 80);
      if (Array.isArray(body.skills)) {
        patch.skills = (body.skills as unknown[])
          .filter((s): s is string => typeof s === "string")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 15);
      }
    }
    if ((body.role === "customer" || body.role === "provider") && user!.role !== "admin") {
      patch.role = body.role;
    }
    if (typeof body.online === "boolean") patch.online = body.online;
    if (Array.isArray(body.availabilityDays)) {
      const allowed = new Set(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
      patch.availabilityDays = (body.availabilityDays as unknown[])
        .filter((d): d is string => typeof d === "string" && allowed.has(d));
    }

    await User.findByIdAndUpdate(user!.sub, patch);

    const db = await User.findById(user!.sub).lean();
    if (!db) throw badRequest("User not found.");
    const profile = toPublicUser(db);

    await setSessionCookie({
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      status: profile.status,
    });

    return json({ profile });
  });
}