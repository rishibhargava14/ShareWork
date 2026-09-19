export type OnlineStatus = "online" | "offline" | "busy";

export type ExpressUser = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "customer" | "provider" | "admin";
  avatar?: string;
  isVerified?: boolean;
  isOnline?: boolean;
  createdAt?: string;
};

export type ExpressWeeklyDay = {
  day: string;
  enabled: boolean;
  start?: string;
  end?: string;
};

export type ExpressProviderProfile = {
  id?: string;
  userId?: string;
  title?: string;
  bio?: string;
  skills?: string[];
  categories?: string[];
  rating?: number;
  reviewsCount?: number;
  completedProjects?: number;
  totalEarnings?: number;
  startingPrice?: number;
  isAvailable?: boolean;
  country?: string;
  companyName?: string;
  totalSpent?: number;
  projectsCount?: number;
  availability?: {
    onlineStatus?: OnlineStatus;
    weeklySchedule?: ExpressWeeklyDay[];
    vacationMode?: { enabled: boolean };
  } | null;
  portfolio?: Array<{ title?: string; images?: string[]; link?: string; description?: string }>;
  onlineStatus?: OnlineStatus;
};

export type DiscoveryProvider = {
  id: string;
  name: string;
  avatar?: string;
  isVerified?: boolean;
  title?: string;
  bio?: string;
  skills?: string[];
  categories?: string[];
  rating?: number;
  reviewsCount?: number;
  startingPrice?: number;
  onlineStatus?: OnlineStatus;
};

export type ExpressGigPackage = {
  name: string;
  description?: string;
  fixedPrice: number;
  deliveryDays: number;
  revisions?: number;
  features?: string[];
};

export type ExpressGig = {
  id: string;
  providerId: string;
  title: string;
  category: string;
  description: string;
  portfolioImages?: Array<{
    id: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    url?: string;
  }>;
  packages?: ExpressGigPackage[];
  isActive?: boolean;
  views?: number;
  orders?: number;
};

export type ExpressProject = {
  id: string;
  customerId: string;
  providerId: string;
  gigId?: string | null;
  conversationId?: string;
  title: string;
  scope?: string;
  deliverables?: string[];
  deliverablesHistory?: Array<{
    files?: Array<{
      id: string;
      originalName?: string;
      mimeType?: string;
      size?: number;
      url?: string;
    }>;
    message?: string;
    submittedAt?: string;
    status?: string;
  }>;
  fixedPrice: number;
  timelineDays: number;
  revisionsAllowed?: number;
  revisionsUsed?: number;
  status: string;
  deadline?: string;
  escrow?: { amount?: number; status?: string; fee?: number | null; gst?: number | null; net?: number | null };
};

export type ExpressTransaction = {
  id: string;
  projectId?: string | null;
  type: string;
  amount: number;
  fee?: number;
  gst?: number;
  netAmount?: number;
  status: string;
  upiId?: string | null;
  createdAt?: string;
};

export type ExpressParticipant = {
  id: string;
  name: string;
  avatar?: string;
  role?: "customer" | "provider" | "admin";
  isVerified?: boolean;
  isOnline?: boolean;
};

export type ExpressConversation = {
  id: string;
  participants: ExpressParticipant[];
  gigId?: string | null;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: Record<string, number>;
  escrowStatus?: string;
  isBlocked?: boolean;
};

export type ExpressAgreement = {
  title?: string;
  scope?: string;
  deliverables?: string[];
  fixedPrice?: number;
  timelineDays?: number;
  revisions?: number;
  terms?: string;
  status?: "pending" | "approved" | "rejected";
};

export type ExpressMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  type: string;
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  file?: { id: string; originalName?: string; mimeType?: string; size?: number; url?: string } | null;
  agreement?: ExpressAgreement | null;
  deliverable?: {
    files?: Array<{ id: string; originalName?: string; mimeType?: string; size?: number; url?: string }>;
    message?: string;
    status?: string;
  } | null;
  isMasked?: boolean;
  createdAt?: string;
};

export const AGREEMENT_PRICES = [5000, 15000, 35000] as const;

export const GIG_CATEGORIES = ["UI/UX", "Web", "App", "Figma", "IT"] as const;

export function isObjectId(value: string | undefined | null): boolean {
  return Boolean(value && /^[a-fA-F0-9]{24}$/.test(value));
}

export type ExpressReview = {
  id: string;
  projectId: string;
  customerId: string;
  providerId: string;
  rating: number;
  comment?: string;
  createdAt?: string;
};

export type ExpressRequirement = {
  id: string;
  customerId: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline?: string;
  skills?: string[];
  status: string;
  createdAt?: string;
};

export type DashboardStats = {
  earnings: { total: number; pending: number; withdrawn: number };
  activeProjects: number;
  rating: number;
  views: number;
  conversion: number | null;
};

export type EarningsPayload = {
  total: number;
  pending: number;
  withdrawn: number;
  available?: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    netAmount?: number;
    status: string;
    createdAt?: string;
    upiId?: string | null;
  }>;
  withdrawals?: Array<{
    id: string;
    type: string;
    amount: number;
    status: string;
    createdAt?: string;
    upiId?: string | null;
  }>;
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts.map((p) => p[0]).slice(0, 2).join("") || "SW").toUpperCase();
}

export function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function compactInr(amount: number): string {
  if (!Number.isFinite(amount)) return "₹0";
  if (Math.abs(amount) >= 100000) {
    const lakhs = amount / 100000;
    const text = lakhs >= 10 ? lakhs.toFixed(0) : lakhs.toFixed(2).replace(/\.?0+$/, "");
    return `₹${text}L`;
  }
  if (Math.abs(amount) >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
}

export function padDescription(text: string, min = 100): string {
  const trimmed = text.trim();
  if (trimmed.length >= min) return trimmed;
  const filler = " Fixed-price ShareWork gig. Scope, timeline, and revisions are listed in the package details.";
  let out = trimmed || "Fixed-price expert gig.";
  while (out.length < min) out += filler;
  return out.slice(0, Math.max(min, trimmed.length));
}

export function apiProjectStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    discussion: "Discussion",
    agreement_pending: "Agreement pending",
    escrow_funded: "Escrow funded",
    in_progress: "In progress",
    delivered: "Delivered",
    completed: "Completed",
    cancelled: "Cancelled",
    disputed: "Disputed",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}
