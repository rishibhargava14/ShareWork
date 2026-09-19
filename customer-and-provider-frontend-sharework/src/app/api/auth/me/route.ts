import User, { toPublicUser } from "@/models/User";
import { routeHandler, json, badRequest } from "@/lib/route";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    if (!user) return json({ user: null });
    const db = await User.findById(user.sub).lean();
    if (!db || db.status !== "active") {
      throw badRequest("This account is no longer active.");
    }
    return json({ user: toPublicUser(db) });
  });
}