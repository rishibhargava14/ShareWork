import bcryptjs from "bcryptjs";
import User, { toPublicUser } from "@/models/User";
import { routeHandler, readJson, badRequest, json } from "@/lib/route";
import { validateEmail, validateName, validatePassword, validatePhone, validateOtp, validateRole, collect } from "@/lib/validation";
import { setSessionCookie } from "@/lib/server-auth";

export async function POST(req: Request) {
  return routeHandler(req, async ({ user }) => {
    if (user) return json({ error: { code: "ALREADY_AUTHENTICATED", message: "You are already signed in." } }, { status: 400 });

    const body = await readJson(req);
    const errors = collect([
      { field: "name", message: validateName(body.name) },
      { field: "email", message: validateEmail(body.email) },
      { field: "phone", message: validatePhone(body.phone) },
      { field: "otp", message: validateOtp(body.otp) },
      { field: "password", message: validatePassword(body.password) },
      { field: "role", message: validateRole(body.role, ["customer", "provider"]) },
    ]);

    if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors as Record<string, string>);

    const email = String(body.email).trim().toLowerCase();
    const exists = await User.exists({ email });
    if (exists) {
      throw badRequest("An account with this email already exists.", { email: "An account with this email already exists." });
    }

    const passwordHash = await bcryptjs.hash(String(body.password), 10);
    const doc = await User.create({
      name: String(body.name).trim(),
      email,
      phone: String(body.phone).trim(),
      passwordHash,
      role: body.role,
      status: "active",
    });

    const sessionUser = toPublicUser(doc);
    await setSessionCookie({
      sub: sessionUser.id,
      email: sessionUser.email,
      name: sessionUser.name,
      role: sessionUser.role,
      status: sessionUser.status,
    });

    return json({ user: sessionUser }, { status: 201 });
  });
}