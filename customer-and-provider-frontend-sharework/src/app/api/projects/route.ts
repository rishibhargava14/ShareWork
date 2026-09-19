import { routeHandler, json, requireAnyUser, readJson, badRequest, notFound } from "@/lib/route";
import { listProjectsForUser, createProjectWithAgreement } from "@/lib/data";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import { validateRequired, validatePrice, validatePositiveInt, collect } from "@/lib/validation";

export async function GET(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const projects = await listProjectsForUser(user!.sub, user!.role);
    return json({ projects });
  });
}

export async function POST(req: Request) {
  return routeHandler(req, async ({ user }) => {
    requireAnyUser(user);
    const body = await readJson(req);
    const errors = collect([
      { field: "conversationId", message: validateRequired(body.conversationId, "Conversation") },
      { field: "title", message: validateRequired(body.title, "Title") },
      { field: "scope", message: validateRequired(body.scope, "Scope") },
      { field: "price", message: validatePrice(body.price) },
      { field: "timelineDays", message: validatePositiveInt(body.timelineDays, "Timeline") },
    ]);
    if (Object.keys(errors).length) throw badRequest("Please fix the highlighted fields.", errors as Record<string, string>);

    const conv = await Conversation.findById(String(body.conversationId)).lean();
    if (!conv) throw notFound("Conversation");
    const isParticipant = conv.participants.some((p: unknown) => String(p) === user!.sub);
    if (!isParticipant) throw badRequest("You are not a participant in this conversation.");
    if (conv.project) throw badRequest("An agreement already exists for this conversation.");

    const [a, b] = conv.participants as unknown as string[];
    const otherId = String(a) === user!.sub ? String(b) : String(a);

    const isCustomer = user!.role === "customer";
    const customerId = isCustomer ? user!.sub : otherId;
    const providerId = isCustomer ? otherId : user!.sub;
    if (!isCustomer) {
      const other = await User.findById(otherId).lean();
      if (!other || other.role !== "customer") throw badRequest("Projects can only be proposed between a customer and a provider.");
    }

    try {
      const view = await createProjectWithAgreement(
        customerId,
        providerId,
        String(body.conversationId),
        String(body.title).trim(),
        String(body.deliverables || body.description || body.scope).trim(),
        Number(body.price),
        Number(body.timelineDays),
        String(body.scope).trim(),
        body.serviceId ? String(body.serviceId) : undefined,
        user!.sub,
        body.revisions ? String(body.revisions) : "2",
        body.deliverables ? String(body.deliverables) : ""
      );
      return json({ project: view }, { status: 201 });
    } catch (e) {
      throw badRequest(e instanceof Error ? e.message : "Could not create the project.");
    }
  });
}