import mongoose from "mongoose";
import User, { toPublicUser, type PublicUser } from "@/models/User";
import Service, { toPublicService, type PublicService } from "@/models/Service";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Project from "@/models/Project";
import Agreement from "@/models/Agreement";
import Escrow from "@/models/Escrow";
import Delivery from "@/models/Delivery";
import Withdrawal from "@/models/Withdrawal";
import { feeBreakdown, type ProjectStatus } from "@/lib/constants";
import type { Role } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type ProjectAgreementView = {
  id: string;
  scope: string;
  price: number;
  timelineDays: number;
  revisions: string;
  deliverables: string;
  status: string;
  proposedBy: string;
  acceptedAt?: string;
  rejectedAt?: string;
  createdAt: string;
};

export type ProjectEscrowView = {
  id: string;
  amount: number;
  status: string;
  fundedAt?: string;
  releasedAt?: string;
};

export type ProjectDeliveryView = {
  id: string;
  message: string;
  sender: string;
  status: string;
  submittedAt: string;
  approvedAt?: string;
  revisionNote?: string;
};

export type ProjectView = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  price: number;
  timelineDays: number;
  customer: PublicUser;
  provider: PublicUser;
  service: PublicService | null;
  conversationId: string | null;
  agreement: ProjectAgreementView | null;
  escrow: ProjectEscrowView | null;
  delivery: ProjectDeliveryView | null;
  createdAt: string;
  updatedAt: string;
};

export type ConversationView = {
  id: string;
  otherUser: PublicUser;
  projectId: string | null;
  serviceTitle: string | null;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export type MessageView = {
  id: string;
  sender: { id: string; name: string };
  content: string;
  read: boolean;
  createdAt: string;
};

export type DashboardStats = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  pendingAgreements: number;
  totalEarnings: number; // released
  pendingEarnings: number;
  totalSpent: number;
  pendingEscrow: number;
};

/* ------------------------------------------------------------------ */
/*  Services                                                           */
/* ------------------------------------------------------------------ */

export async function searchServices(params: {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  onlineNow?: boolean;
  sort?: string;
  onlyActive?: boolean;
}): Promise<PublicService[]> {
  const filter: Record<string, unknown> = {};
  if (params.onlyActive !== false) filter.active = true;
  if (params.category) filter.category = params.category;
  if ((params.minPrice && params.minPrice > 0) || (params.maxPrice && params.maxPrice > 0)) {
    const price: Record<string, number> = {};
    if (params.minPrice && params.minPrice > 0) price.$gte = params.minPrice;
    if (params.maxPrice && params.maxPrice > 0) price.$lte = params.maxPrice;
    filter.price = price;
  }
  if (params.q) {
    const re = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: re }, { description: re }, { skills: { $in: [re] } }, { tags: { $in: [re] } }];
  }

  let sort: Record<string, 1 | -1> = { createdAt: -1 };
  if (params.sort === "price_asc") sort = { price: 1 };
  else if (params.sort === "price_desc") sort = { price: -1 };
  else if (params.sort === "newest") sort = { createdAt: -1 };

  const docs = await Service.find(filter).sort(sort).populate("provider").limit(50).lean();
  return docs
    .map(toPublicService)
    .filter((svc) => {
      if (params.minRating && (svc.provider.rating ?? 0) < params.minRating) return false;
      if (params.onlineNow && !svc.provider.online) return false;
      return true;
    });
}

export async function getService(id: string): Promise<PublicService | null> {
  const doc = await Service.findById(id).populate("provider").lean();
  return doc ? toPublicService(doc) : null;
}

export async function updateService(
  serviceId: string,
  providerId: string,
  update: Record<string, unknown>
): Promise<boolean> {
  const doc = await Service.findById(serviceId).lean();
  if (!doc) return false;
  if (String(doc.provider) !== providerId) return false;
  await Service.findByIdAndUpdate(serviceId, update);
  return true;
}

export async function deleteService(serviceId: string, providerId: string): Promise<boolean> {
  const doc = await Service.findById(serviceId).lean();
  if (!doc) return false;
  if (String(doc.provider) !== providerId) return false;
  await Service.findByIdAndDelete(serviceId);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Providers                                                          */
/* ------------------------------------------------------------------ */

export async function listProviders(params: { q?: string; skill?: string; sort?: string }): Promise<PublicUser[]> {
  const filter: Record<string, unknown> = { role: "provider", status: "active" };
  if (params.skill) {
    const re = new RegExp(params.skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.skills = re;
  }
  if (params.q) {
    const re = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { title: re }, { bio: re }, { skills: { $in: [re] } }];
  }
  const docs = await User.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  return docs.map(toPublicUser);
}

export async function getProviderProfile(id: string): Promise<(PublicUser & { services: PublicService[] }) | null> {
  const doc = await User.findById(id).lean();
  if (!doc || doc.role !== "provider") return null;
  const services = await searchServices({ onlyActive: false }).then((svcs) =>
    svcs.filter((s) => s.provider.id === String(doc._id))
  );
  return { ...toPublicUser(doc), services };
}

/* ------------------------------------------------------------------ */
/*  Conversations                                                      */
/* ------------------------------------------------------------------ */

export async function listConversationsFor(userId: string): Promise<ConversationView[]> {
  const convs = await Conversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate("participants", "name title role skills location")
    .populate("service", "title")
    .lean();

  const userObjId = new mongoose.Types.ObjectId(userId);
  const result: ConversationView[] = [];

  for (const conv of convs) {
    const participants = conv.participants as unknown as Array<{ _id: unknown; name: string; title?: string; role: string; skills?: string[]; location?: string; status?: string }>;
    const other = participants.find((p) => String(p._id) !== userId);
    if (!other) continue;
    const otherUser = toPublicUser({ _id: other._id, name: other.name, title: other.title, role: other.role, skills: other.skills ?? [], location: other.location, status: other.status ?? "active", email: "" } as never);

    const unreadCount = await Message.countDocuments({
      conversation: conv._id,
      sender: { $ne: userObjId },
      readBy: { $ne: userObjId },
    });

    result.push({
      id: String(conv._id),
      otherUser,
      projectId: conv.project ? String(conv.project) : null,
      serviceTitle: (conv.service as unknown as { title?: string } | null)?.title ?? null,
      lastMessagePreview: conv.lastMessagePreview ?? "",
      lastMessageAt: (conv.updatedAt ?? new Date()).toISOString(),
      unreadCount,
    });
  }
  return result;
}

export async function getConversationForUser(convId: string, userId: string) {
  const conv = await Conversation.findById(convId).populate("participants", "name title role skills location email").lean();
  if (!conv) return null;
  const isParticipant = conv.participants.some((p: unknown) => String((p as { _id: unknown })._id) === userId);
  if (!isParticipant) return null;
  return conv;
}

export type ConversationDetailView = {
  id: string;
  participants: PublicUser[];
  projectId: string | null;
  serviceId: string | null;
};

export async function getConversationView(convId: string, userId: string): Promise<ConversationDetailView | null> {
  const conv = await getConversationForUser(convId, userId);
  if (!conv) return null;
  const participants = (conv.participants ?? []) as unknown as Array<{ _id: unknown; name: string; title?: string; role: string; skills?: string[]; location?: string; email?: string; status?: string }>;
  return {
    id: String(conv._id),
    participants: participants.map((p) =>
      toPublicUser({ _id: p._id, name: p.name, title: p.title, role: p.role, skills: p.skills ?? [], location: p.location, email: p.email ?? "", status: p.status ?? "active" } as never)
    ),
    projectId: conv.project ? String(conv.project) : null,
    serviceId: conv.service ? String(conv.service) : null,
  };
}

export async function createConversation(customerId: string, providerId: string, serviceId?: string) {
  const existing = await Conversation.findOne({
    participants: { $all: [customerId, providerId] },
    project: null,
  }).lean();
  if (existing) return String(existing._id);

  const conv = await Conversation.create({
    participants: [customerId, providerId],
    service: serviceId || undefined,
  });
  return String(conv._id);
}

export async function sendMessage(convId: string, senderId: string, content: string) {
  const conv = await Conversation.findById(convId).lean();
  if (!conv) return null;
  const isParticipant = conv.participants.some((p: unknown) => String(p) === senderId);
  if (!isParticipant) return null;
  const msg = await Message.create({ conversation: convId, sender: senderId, content });
  await Conversation.findByIdAndUpdate(convId, { lastMessageAt: new Date(), lastMessagePreview: content.slice(0, 120) });
  return msg;
}

export async function markConversationRead(convId: string, userId: string) {
  await Message.updateMany(
    { conversation: convId, sender: { $ne: userId }, readBy: { $ne: userId } },
    { $addToSet: { readBy: userId } }
  );
}

export async function listMessages(convId: string, userId: string): Promise<MessageView[] | null> {
  const conv = await Conversation.findById(convId).lean();
  if (!conv) return null;
  if (!conv.participants.some((p: unknown) => String(p) === userId)) return null;

  const docs = await Message.find({ conversation: convId }).sort({ createdAt: 1 }).populate("sender", "name").lean();

  return docs.map((doc) => {
    const sender = doc.sender as unknown as { _id: unknown; name: string };
    const isOwn = String(sender._id) === userId;
    const readArr = (doc.readBy ?? []) as unknown as mongoose.Types.ObjectId[];
    return {
      id: String(doc._id),
      sender: { id: String(sender._id), name: sender.name },
      content: doc.content,
      read: isOwn || readArr.some((r) => String(r) === userId),
      createdAt: (doc as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Projects                                                           */
/* ------------------------------------------------------------------ */

async function loadProjectView(projectId: string): Promise<ProjectView | null> {
  const proj = await Project.findById(projectId).lean();
  if (!proj) return null;

  const [customerDoc, providerDoc, agreementDoc, escrowDoc, deliveryDoc] = await Promise.all([
    User.findById(proj.customer).lean(),
    User.findById(proj.provider).lean(),
    Agreement.findOne({ project: proj._id }).lean(),
    Escrow.findOne({ project: proj._id }).lean(),
    Delivery.findOne({ project: proj._id }).lean(),
  ]);

  const serviceDoc = proj.service ? await Service.findById(proj.service).populate("provider").lean() : null;

  return {
    id: String(proj._id),
    title: proj.title,
    description: proj.description,
    status: proj.status as ProjectStatus,
    price: proj.price,
    timelineDays: proj.timelineDays,
    customer: customerDoc ? toPublicUser(customerDoc) : { id: String(proj.customer), name: "User", email: "", role: "customer", status: "active", skills: [], createdAt: "" } as PublicUser,
    provider: providerDoc ? toPublicUser(providerDoc) : { id: String(proj.provider), name: "User", email: "", role: "provider", status: "active", skills: [], createdAt: "" } as PublicUser,
    service: serviceDoc ? toPublicService(serviceDoc) : null,
    conversationId: proj.conversation ? String(proj.conversation) : null,
    agreement: agreementDoc
      ? {
          id: String(agreementDoc._id),
          scope: agreementDoc.scope,
          price: agreementDoc.price,
          timelineDays: agreementDoc.timelineDays,
          revisions: (agreementDoc as { revisions?: string }).revisions || "2",
          deliverables: (agreementDoc as { deliverables?: string }).deliverables || "",
          status: agreementDoc.status,
          proposedBy: String(agreementDoc.proposedBy),
          acceptedAt: agreementDoc.acceptedAt?.toISOString(),
          rejectedAt: agreementDoc.rejectedAt?.toISOString(),
          createdAt: (agreementDoc as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
        }
      : null,
    escrow: escrowDoc
      ? {
          id: String(escrowDoc._id),
          amount: escrowDoc.amount,
          status: escrowDoc.status,
          fundedAt: escrowDoc.fundedAt?.toISOString(),
          releasedAt: escrowDoc.releasedAt?.toISOString(),
        }
      : null,
    delivery: deliveryDoc
      ? {
          id: String(deliveryDoc._id),
          message: deliveryDoc.message,
          sender: String(deliveryDoc.sender),
          status: deliveryDoc.status,
          submittedAt: (deliveryDoc as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
          approvedAt: deliveryDoc.approvedAt?.toISOString(),
          revisionNote: deliveryDoc.revisionNote || undefined,
        }
      : null,
    createdAt: (proj as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
    updatedAt: (proj as unknown as { updatedAt?: Date }).updatedAt?.toISOString() ?? "",
  };
}

export { loadProjectView };

export async function listProjectsForUser(userId: string, role: Role): Promise<ProjectView[]> {
  const filter = role === "provider" ? { provider: userId } : { customer: userId };
  const projects = await Project.find(filter).sort({ updatedAt: -1 }).lean();
  const views: ProjectView[] = [];
  for (const p of projects) {
    const view = await loadProjectView(String(p._id));
    if (view) views.push(view);
  }
  return views;
}

export async function getDashboardStats(userId: string, role: Role): Promise<DashboardStats> {
  const filter = role === "provider" ? { provider: userId } : { customer: userId };
  const projects = await Project.find(filter).lean();
  const active = projects.filter((p) => !["COMPLETED", "CANCELLED", "DISPUTED"].includes(p.status));
  const completed = projects.filter((p) => p.status === "COMPLETED");

  let totalSpent = 0;
  let pendingEscrow = 0;
  let totalEarnings = 0;
  let pendingEarnings = 0;

  for (const p of projects) {
    const esc = await Escrow.findOne({ project: p._id }).lean();
    if (role === "customer") {
      totalSpent += esc?.status === "released" ? esc.amount : 0;
      pendingEscrow += esc?.status === "pending" || esc?.status === "funded" ? esc.amount : 0;
    } else {
      totalEarnings += esc?.status === "released" ? esc.amount : 0;
      pendingEarnings += esc?.status === "funded" ? esc.amount : 0;
    }
  }

  const pendingAgreements = (await Agreement.find({ status: "pending" }).lean()).filter((ag) => {
    return projects.some((p) => String(p._id) === String(ag.project));
  });

  return {
    totalProjects: projects.length,
    activeProjects: active.length,
    completedProjects: completed.length,
    pendingAgreements: pendingAgreements.length,
    totalEarnings,
    pendingEarnings,
    totalSpent,
    pendingEscrow,
  };
}

export async function listAllProjects(): Promise<ProjectView[]> {
  const projects = await Project.find().sort({ updatedAt: -1 }).limit(100).lean();
  const views: ProjectView[] = [];
  for (const p of projects) {
    const view = await loadProjectView(String(p._id));
    if (view) views.push(view);
  }
  return views;
}

/* ------------------------------------------------------------------ */
/*  Project actions                                                    */
/* ------------------------------------------------------------------ */

export async function createProjectWithAgreement(
  customerId: string,
  providerId: string,
  conversationId: string,
  title: string,
  description: string,
  price: number,
  timelineDays: number,
  scope: string,
  serviceId?: string,
  proposedById?: string,
  revisions?: string,
  deliverables?: string
): Promise<ProjectView> {
  const existingConv = await Conversation.findById(conversationId).lean();
  if (!existingConv) throw new Error("Conversation not found.");
  if (!existingConv.participants.map((p: unknown) => String(p)).includes(customerId) || !existingConv.participants.map((p: unknown) => String(p)).includes(providerId)) {
    throw new Error("Not authorized for this conversation.");
  }

  const proj = await Project.create({
    customer: customerId,
    provider: providerId,
    service: serviceId || undefined,
    conversation: conversationId,
    title,
    description,
    status: "AGREEMENT_ACCEPTED",
    price,
    timelineDays,
  });

  await Agreement.create({
    project: proj._id,
    scope,
    price,
    timelineDays,
    revisions: revisions || "2",
    deliverables: deliverables || "",
    status: "accepted",
    acceptedAt: new Date(),
    proposedBy: proposedById ?? customerId,
  });

  await Escrow.create({ project: proj._id, amount: price, status: "pending" });
  await Conversation.findByIdAndUpdate(conversationId, { project: proj._id });

  const view = await loadProjectView(String(proj._id));
  return view!;
}

async function participantPermissions(projectId: string, userId: string) {
  const proj = await Project.findById(projectId).lean();
  if (!proj) return null;
  const isCustomer = String(proj.customer) === String(userId);
  const isProvider = String(proj.provider) === String(userId);
  if (!isCustomer && !isProvider) return null;
  return { proj, isCustomer, isProvider };
}

/** Customer or provider accepts the pending agreement. */
export async function acceptAgreement(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  const { proj } = perms;
  if (proj.status !== "AGREEMENT_PENDING") throw new Error(`Cannot accept the agreement in the current state (${proj.status}).`);
  const agreement = await Agreement.findOne({ project: projectId, status: "pending" }).lean();
  if (!agreement) throw new Error("There is no pending agreement to accept.");
  if (String(agreement.proposedBy) === userId) {
    throw new Error("You proposed this agreement — the other party must accept it.");
  }
  await Promise.all([
    Agreement.findOneAndUpdate({ project: projectId, status: "pending" }, { status: "accepted", acceptedAt: new Date() }),
    Project.findByIdAndUpdate(projectId, { status: "AGREEMENT_ACCEPTED" }),
  ]);
}

/** Customer or provider rejects the pending agreement. */
export async function rejectAgreement(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  const { proj } = perms;
  if (proj.status !== "AGREEMENT_PENDING") throw new Error("There is no pending agreement to reject.");
  await Promise.all([
    Agreement.findOneAndUpdate({ project: projectId, status: "pending" }, { status: "rejected", rejectedAt: new Date() }),
    Escrow.findOneAndUpdate({ project: projectId, status: "pending" }, { status: "cancelled" }),
    Project.findByIdAndUpdate(projectId, { status: "CANCELLED" }),
  ]);
}

/** Customer funds escrow (simulated). Project moves to IN_PROGRESS. */
export async function fundEscrow(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  if (!perms.isCustomer) throw new Error("Only the customer can fund escrow.");
  const { proj } = perms;
  if (!["AGREEMENT_ACCEPTED", "ESCROW_PENDING", "ESCROW_FUNDED"].includes(proj.status)) {
    throw new Error(`Escrow can only be funded after the agreement is accepted (current state: ${proj.status}).`);
  }
  await Promise.all([
    Escrow.findOneAndUpdate({ project: projectId }, { status: "funded", fundedAt: new Date() }),
    Project.findByIdAndUpdate(projectId, { status: "ESCROW_FUNDED" }),
  ]);
}

export async function markInProgress(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  const { proj } = perms;
  if (proj.status !== "ESCROW_FUNDED") {
    throw new Error(`Project can only be marked in progress after escrow is funded (current state: ${proj.status}).`);
  }
  await Project.findByIdAndUpdate(projectId, { status: "IN_PROGRESS" });
}

/** Provider submits a delivery for the project. */
export async function submitDelivery(projectId: string, userId: string, message: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  if (!perms.isProvider) throw new Error("Only the provider can submit a delivery.");
  const { proj } = perms;
  if (!["IN_PROGRESS", "REVISION_REQUESTED"].includes(proj.status)) {
    throw new Error(`Deliveries can only be submitted while the project is in progress (current state: ${proj.status}).`);
  }
  await Promise.all([
    Delivery.findOneAndUpdate(
      { project: projectId },
      { "$set": { sender: userId, message, status: "pending" }, "$unset": { approvedAt: "", revisionNote: "" } },
      { upsert: true }
    ),
    Project.findByIdAndUpdate(projectId, { status: "DELIVERED" }),
  ]);
}

/** Customer approves the latest delivery → escrow released (simulated) → project completed. */
export async function approveDelivery(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  if (!perms.isCustomer) throw new Error("Only the customer can approve a delivery.");
  const { proj } = perms;
  if (proj.status !== "DELIVERED") throw new Error("There is no delivered work to approve.");
  await Promise.all([
    Delivery.findOneAndUpdate({ project: projectId }, { status: "approved", approvedAt: new Date() }),
    Escrow.findOneAndUpdate({ project: projectId, status: "funded" }, { status: "released", releasedAt: new Date() }),
    Project.findByIdAndUpdate(projectId, { status: "COMPLETED" }),
  ]);
}

/** Customer asks the provider for revisions. */
export async function requestRevision(projectId: string, userId: string, note: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  if (!perms.isCustomer) throw new Error("Only the customer can request revisions.");
  const { proj } = perms;
  if (proj.status !== "DELIVERED") throw new Error("There is no delivered work to request revisions on.");
  await Promise.all([
    Delivery.findOneAndUpdate({ project: projectId }, { status: "pending", revisionNote: note.trim().slice(0, 2000) }),
    Project.findByIdAndUpdate(projectId, { status: "REVISION_REQUESTED" }),
  ]);
}

/** Customer raises a dispute on funded work. */
export async function raiseDispute(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  if (!perms.isCustomer) throw new Error("Only the customer can raise a dispute.");
  const { proj } = perms;
  if (!["ESCROW_FUNDED", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED"].includes(proj.status)) {
    throw new Error("Disputes can only be raised while escrow is funded.");
  }
  await Project.findByIdAndUpdate(projectId, { status: "DISPUTED" });
}

/** Either party cancels before escrow is funded. */
export async function cancelProject(projectId: string, userId: string): Promise<void> {
  const perms = await participantPermissions(projectId, userId);
  if (!perms) throw new Error("You are not a participant in this project.");
  const { proj } = perms;
  if (!["INQUIRY", "AGREEMENT_PENDING", "AGREEMENT_ACCEPTED", "ESCROW_PENDING"].includes(proj.status)) {
    throw new Error(`The project cannot be cancelled at this stage (current state: ${proj.status}).`);
  }
  await Promise.all([
    Agreement.findOneAndUpdate({ project: projectId, status: "pending" }, { status: "rejected", rejectedAt: new Date() }),
    Escrow.findOneAndUpdate({ project: projectId, status: "pending" }, { status: "cancelled" }),
    Project.findByIdAndUpdate(projectId, { status: "CANCELLED" }),
  ]);
}

/** Admin can close an active project (cancel or force complete). */
export async function adminSetProjectStatus(projectId: string, status: "CANCELLED" | "COMPLETED"): Promise<void> {
  const proj = await Project.findById(projectId).lean();
  if (!proj) throw new Error("Project not found.");
  if (["COMPLETED", "CANCELLED"].includes(proj.status)) throw new Error("Project is already closed.");
  const escrow = await Escrow.findOne({ project: projectId }).lean();
  const updates: Array<Promise<unknown>> = [Project.findByIdAndUpdate(projectId, { status })];
  if (status === "CANCELLED") {
    // Cancel any pending agreement; also cancel funded escrow (no money moves).
    updates.push(
      Agreement.findOneAndUpdate({ project: projectId, status: "pending" }, { status: "rejected", rejectedAt: new Date() }),
      Escrow.findOneAndUpdate({ project: projectId, status: { $in: ["pending", "funded"] } }, { status: "cancelled" })
    );
  } else if (status === "COMPLETED" && escrow?.status === "funded") {
    // Force-completing: release escrow so provider earnings are credited.
    updates.push(
      Escrow.findOneAndUpdate({ project: projectId, status: "funded" }, { status: "released", releasedAt: new Date() })
    );
  }
  await Promise.all(updates);
}

/* ------------------------------------------------------------------ */
/*  Admin                                                              */
/* ------------------------------------------------------------------ */

export async function getAdminStats() {
  const [users, services, projects, withdrawals] = await Promise.all([
    User.countDocuments(),
    Service.countDocuments(),
    Project.countDocuments(),
    Withdrawal.countDocuments(),
  ]);
  const activeProjects = await Project.countDocuments({ status: { $nin: ["COMPLETED", "CANCELLED"] } });
  const completedProjects = await Project.countDocuments({ status: "COMPLETED" });
  const totalEscrowReleased = await Escrow.find({ status: "released" }).lean().then((docs) => docs.reduce((sum, d) => sum + d.amount, 0));
  return { users, services, projects, activeProjects, completedProjects, totalEscrowReleased, withdrawals };
}

export async function listAllUsers(params: { q?: string; role?: string }): Promise<PublicUser[]> {
  const filter: Record<string, unknown> = {};
  if (params.role) filter.role = params.role;
  if (params.q) {
    const re = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { email: re }];
  }
  const docs = await User.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return docs.map(toPublicUser);
}

export async function listAllProjectsAdmin(status?: string) {
  const filter: Record<string, unknown> = {};
  if (status && typeof status === "string" && status.length) filter.status = status;
  const docs = await Project.find(filter)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("customer", "name email role")
    .populate("provider", "name email role")
    .lean();
  return docs.map((p) => ({
    id: String(p._id),
    title: p.title,
    status: p.status,
    price: p.price,
    customer: (p.customer as unknown as { name?: string; id?: unknown }).name ?? "Unknown",
    provider: (p.provider as unknown as { name?: string; id?: unknown }).name ?? "Unknown",
    createdAt: (p as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
  }));
}

export async function patchAdminUser(userId: string, data: { status?: "active" | "suspended" }) {
  const update: Record<string, unknown> = {};
  if (data.status) update.status = data.status;
  await User.findByIdAndUpdate(userId, update);
}

export async function listAllServicesAdmin(): Promise<PublicService[]> {
  const docs = await Service.find().sort({ createdAt: -1 }).limit(200).populate("provider").lean();
  return docs.map(toPublicService);
}

export async function patchAdminService(serviceId: string, data: { active?: boolean }) {
  const update: Record<string, unknown> = {};
  if (data.active !== undefined) update.active = data.active;
  await Service.findByIdAndUpdate(serviceId, update);
}

export async function listAllWithdrawals(): Promise<Array<{
  id: string;
  provider: PublicUser;
  amount: number;
  status: string;
  requestedAt: string;
  resolvedAt?: string;
}>> {
  const docs = await Withdrawal.find().sort({ createdAt: -1 }).limit(200).populate("provider").lean();
  return docs.map((d) => {
    const prov = d.provider as unknown as { _id: unknown; name: string; email: string; role: string; skills?: string[]; status?: string };
    return {
      id: String(d._id),
      provider: toPublicUser({ _id: prov._id, name: prov.name, email: prov.email, role: prov.role, skills: prov.skills ?? [], status: prov.status ?? "active" } as never),
      amount: d.amount,
      status: d.status,
      requestedAt: (d as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
      resolvedAt: d.resolvedAt?.toISOString(),
    };
  });
}

export async function patchWithdrawal(withdrawalId: string, status: string): Promise<boolean> {
  const allowed = ["processing", "completed", "failed"];
  if (!allowed.includes(status)) return false;
  const update: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed") update.resolvedAt = new Date();
  await Withdrawal.findByIdAndUpdate(withdrawalId, update);
  return true;
}

/* ------------------------------------------------------------------ */
/*  Withdrawals (provider)                                             */
/* ------------------------------------------------------------------ */

export async function createWithdrawal(providerId: string, amount: number, payoutMethod: string) {
  const proj = await Project.find({ provider: providerId, status: "COMPLETED" }).lean();
  const releasedEscrows = await Promise.all(
    proj.map((p) => Escrow.findOne({ project: p._id, status: "released" }).lean())
  );
  const released = releasedEscrows.reduce((sum, d) => sum + (d?.amount ?? 0), 0);

  const existingPending = await Withdrawal.find({ provider: providerId, status: { $in: ["pending", "processing"] } }).lean();
  const pendingTotal = existingPending.reduce((sum, w) => sum + w.amount, 0);

  const available = released - pendingTotal;
  if (amount > available) return null;
  const doc = await Withdrawal.create({ provider: providerId, amount, status: "pending", payoutMethod });
  return String(doc._id);
}

export async function requestWithdrawal(providerId: string, amount: number, payoutMethod: string): Promise<{ _id: unknown; status: string }> {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid amount.");
  const id = await createWithdrawal(providerId, amount, payoutMethod);
  if (!id) throw new Error("Insufficient available balance for this withdrawal.");
  const doc = await Withdrawal.findById(id).lean();
  return { _id: String(doc!._id), status: doc!.status };
}

export async function listWithdrawals(providerId: string) {
  const docs = await Withdrawal.find({ provider: providerId }).sort({ createdAt: -1 }).limit(100).lean();
  return docs.map((d) => ({
    id: String(d._id),
    amount: d.amount,
    payoutMethod: d.payoutMethod,
    status: d.status,
    requestedAt: (d as unknown as { createdAt?: Date }).createdAt?.toISOString() ?? "",
    resolvedAt: d.resolvedAt?.toISOString(),
  }));
}

export async function listProviderEarnings(providerId: string) {
  const completed = await Project.find({ provider: providerId, status: "COMPLETED" }).lean();
  const releasedEscrows = await Promise.all(completed.map((p) => Escrow.findOne({ project: p._id, status: "released" }).lean()));
  const totalReleased = releasedEscrows.reduce((sum, d) => sum + (d?.amount ?? 0), 0);

  const active = await Project.find({ provider: providerId, status: { $in: ["IN_PROGRESS", "DELIVERED", "AGREEMENT_ACCEPTED"] } }).lean();
  const activeEscrows = await Promise.all(active.map((p) => Escrow.findOne({ project: p._id, status: "funded" }).lean()));
  const pending = activeEscrows.reduce((sum, d) => sum + (d?.amount ?? 0), 0);

  const withdrawals = await Withdrawal.find({ provider: providerId }).sort({ createdAt: -1 }).lean();
  const withdrawn = withdrawals.filter((w) => w.status === "completed").reduce((sum, w) => sum + w.amount, 0);
  const inFlight = withdrawals
    .filter((w) => w.status === "pending" || w.status === "processing")
    .reduce((sum, w) => sum + w.amount, 0);
  const platformFee = releasedEscrows.reduce((sum, d) => sum + feeBreakdown(d?.amount ?? 0).platformFee, 0);
  const gst = releasedEscrows.reduce((sum, d) => sum + feeBreakdown(d?.amount ?? 0).gst, 0);
  const netReleased = releasedEscrows.reduce((sum, d) => sum + feeBreakdown(d?.amount ?? 0).netToProvider, 0);
  const available = netReleased - withdrawn - inFlight;

  return { totalReleased, pending, withdrawn, available: Math.max(0, available), platformFee, gst, netReleased, withdrawals };
}

/* ------------------------------------------------------------------ */
/*  Service search for browse (provider-profile-linked)                */
/* ------------------------------------------------------------------ */

export async function listProviderServices(userId: string): Promise<PublicService[]> {
  const docs = await Service.find({ provider: userId }).populate("provider").sort({ createdAt: -1 }).lean();
  return docs.map(toPublicService);
}