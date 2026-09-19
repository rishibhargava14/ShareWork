import bcryptjs from "bcryptjs";
import User, { toPublicUser } from "@/models/User";
import { routeHandler, readJson, badRequest, json } from "@/lib/route";
import { validateEmail, collect } from "@/lib/validation";
import { setSessionCookie } from "@/lib/server-auth";

export async function POST(req: Request) {
  return routeHandler(req, async ({ user }) => {
    if (user) return json({ error: { code: "ALREADY_AUTHENTICATED", message: "You are already signed in." } }, { status: 400 });

    const body = await readJson(req);
    const errors = collect([{ field: "email", message: validateEmail(body.email) }]);
    if (!String(body.password || "")) errors.password = "Password is required.";
    if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors as Record<string, string>);

    const email = String(body.email).trim().toLowerCase();
    const requested = body.role === "customer" || body.role === "provider" ? body.role : "customer";
    let db = await User.findOne({ email }).lean();

    if (!db) {
      const passwordHash = await bcryptjs.hash(String(body.password), 10);
      const created = await User.create({
        name: email.split("@")[0],
        email,
        passwordHash,
        role: requested,
        status: "active",
      });
      db = created.toObject();
    } else if (db.status !== "active") {
      throw badRequest("This account is suspended. Contact support.", { email: "Account is suspended." });
    } else if (db.role !== "admin" && db.role !== requested) {
      await User.findByIdAndUpdate(db._id, { role: requested });
      db = { ...db, role: requested };
    }

    const sessionUser = toPublicUser(db);
    await setSessionCookie({
      sub: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      status: sessionUser.status,
    });

    return json({ user: sessionUser });
  });
}
