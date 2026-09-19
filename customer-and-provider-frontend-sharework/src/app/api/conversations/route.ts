import { routeHandler, json, requireAnyUser, readJson, badRequest } from "@/lib/route";
import { listConversationsFor, createConversation } from "@/lib/data";
import User from "@/models/User";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const conversations = await listConversationsFor(user!.sub);
    return json({ conversations });
  });
}

export async function POST(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const body = await readJson(req);
    const toUserId = String(body.toUserId ?? "").trim();
    if (!toUserId) throw badRequest("toUserId is required.", { toUserId: "Required" });
    if (String(user!.sub) === toUserId) throw badRequest("You cannot message yourself.");

    const other = await User.findById(toUserId).lean();
    if (!other) throw badRequest("User not found.", { toUserId: "Invalid user" });

    let customerId = user!.sub;
    let providerId = other._id;

    if (user!.role === "provider") {
      if (other.role !== "customer") {
        throw badRequest("Providers can message customers.", { toUserId: "Invalid customer" });
      }
      customerId = String(other._id);
      providerId = user!.sub;
    } else {
      if (other.role !== "provider") {
        throw badRequest("Customers can message providers.", { toUserId: "Invalid provider" });
      }
    }

    const convId = await createConversation(customerId, providerId, body.serviceId ? String(body.serviceId) : undefined);
    return json({ conversationId: convId });
  });
}