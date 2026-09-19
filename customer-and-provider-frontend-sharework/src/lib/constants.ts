export const ROLES = ["customer", "provider", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = [
  "Web Development",
  "AI & Automation",
  "Mobile Apps",
  "Design & UX",
  "Data & Analytics",
  "Cloud & DevOps",
  "Marketing",
  "Writing & Content",
] as const;

/** Discover chips. `category` matches Express SERVICE_CATEGORIES (`UI/UX|Web|App|Figma|IT`). */
export const DISCOVER_CHIPS = [
  { id: "all", label: "All", category: "" },
  { id: "web", label: "Web", category: "Web" },
  { id: "mobile", label: "App", category: "App" },
  { id: "design", label: "UI/UX", category: "UI/UX" },
  { id: "figma", label: "Figma", category: "Figma" },
  { id: "it", label: "IT", category: "IT" },
] as const;

export const HTML_EXPERTS = [
  { id: 1, name: "Aarav Mehta", title: "Full-Stack React & Node.js Expert", rating: 4.9, reviews: 127, projects: 89, location: "Bengaluru", online: true, skills: ["React", "Node.js", "Postgres"], price: 15000, avatar: "AM", category: "Web Dev" },
  { id: 2, name: "Sara Khan", title: "Mobile App Developer - Flutter", rating: 4.8, reviews: 94, projects: 62, location: "Delhi", online: true, skills: ["Flutter", "Firebase", "UI/UX"], price: 12000, avatar: "SK", category: "Mobile" },
  { id: 3, name: "Vikram Patel", title: "AI/ML Engineer - LLMs & RAG", rating: 5, reviews: 56, projects: 41, location: "Pune", online: false, skills: ["Python", "LangChain", "OpenAI"], price: 35000, avatar: "VP", category: "AI" },
  { id: 4, name: "Neha Singh", title: "UI/UX Designer - SaaS & Dashboards", rating: 4.9, reviews: 112, projects: 78, location: "Mumbai", online: true, skills: ["Figma", "Design System", "Prototyping"], price: 8000, avatar: "NS", category: "Design" },
  { id: 5, name: "Rohan Das", title: "DevOps & Cloud Infrastructure", rating: 4.7, reviews: 71, projects: 53, location: "Hyderabad", online: false, skills: ["AWS", "Docker", "Kubernetes"], price: 20000, avatar: "RD", category: "DevOps" },
  { id: 6, name: "Ishita Roy", title: "Backend Engineer - APIs & Scale", rating: 4.9, reviews: 88, projects: 67, location: "Kolkata", online: true, skills: ["Go", "Redis", "Microservices"], price: 18000, avatar: "IR", category: "Web Dev" },
] as const;

export const HTML_INBOX = [
  { id: 1, name: "Aarav Mehta", last: "Sure, I can deliver in 7 days...", time: "2m", unread: 2, online: true },
  { id: 2, name: "Sara Khan", last: "Agreement approved! Funding escrow", time: "1h", unread: 0, online: true },
  { id: 3, name: "Vikram Patel", last: "Delivered final model for review", time: "3h", unread: 1, online: false },
] as const;

export const HTML_THREAD = [
  { from: "them" as const, text: "Hi! I reviewed your SaaS dashboard brief. I can do Standard package ₹15k in 7 days, 2 revisions. Shall I draft agreement?" },
  { from: "me" as const, text: "Yes please. Scope: Analytics, auth, billing page, responsive." },
] as const;

export const HTML_AGREEMENT = {
  title: "SaaS Dashboard Build",
  scope: "Build responsive dashboard with analytics, auth, billing.",
  deliverables: "Source code, Figma, Deployment",
  price: "15000",
  timeline: "7 days",
  revisions: "2",
} as const;

export const HTML_DELIVERY = "github.com/sharework/saas-dash • preview link + Loom";
export const HTML_ABOUT = "Fixed price expert. No hourly. I deliver production-ready code with docs, Figma, and deployment. Chat to scope, agree, escrow, deliver.";

export function htmlExpertByName(name: string) {
  return HTML_EXPERTS.find((e) => e.name.toLowerCase() === name.trim().toLowerCase()) ?? null;
}

export const BUDGET_CHIPS = [
  { id: "html", label: "Budget ₹5k-₹50k+", minPrice: 5000, maxPrice: 50000 },
] as const;

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const DEMO_OTP = "123456";
export const PLATFORM_FEE_RATE = 0.1;
export const GST_ON_FEE_RATE = 0.18;

export function feeBreakdown(gross: number) {
  const platformFee = Math.round(gross * PLATFORM_FEE_RATE);
  const gst = Math.round(platformFee * GST_ON_FEE_RATE);
  const netToProvider = Math.max(0, gross - platformFee - gst);
  return { gross, platformFee, gst, netToProvider };
}

export interface PricePackage {
  id?: string;
  name: string;
  price: number;
  deliveryDays: number;
  description?: string;
  features: string[];
}

export const HTML_PACKAGES: PricePackage[] = [
  { name: "Basic", price: 5000, deliveryDays: 5, description: "Core fixed-price deliverable", features: ["Scope as listed", "2 revisions"] },
  { name: "Standard", price: 15000, deliveryDays: 7, description: "Standard scope, 2 revisions", features: ["Priority chat", "2 revisions", "Source files"] },
  { name: "Premium", price: 35000, deliveryDays: 14, description: "Full package with dedicated support", features: ["Dedicated support", "Unlimited revisions"] },
];

export function defaultPackages(): PricePackage[] {
  return HTML_PACKAGES.map((p) => ({ ...p }));
}

export function packagesForService(svc: { packages?: PricePackage[] }): PricePackage[] {
  if (svc.packages && svc.packages.length > 0) return svc.packages;
  return defaultPackages();
}

export const PROJECT_STATUSES = [
  "INQUIRY",
  "AGREEMENT_PENDING",
  "AGREEMENT_ACCEPTED",
  "ESCROW_PENDING",
  "ESCROW_FUNDED",
  "IN_PROGRESS",
  "DELIVERED",
  "REVISION_REQUESTED",
  "APPROVED",
  "PAYMENT_RELEASED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const AGREEMENT_STATUSES = ["pending", "accepted", "rejected"] as const;
export const ESCROW_STATUSES = ["pending", "funded", "released", "cancelled"] as const;
export const DELIVERY_STATUSES = ["pending", "approved"] as const;
export const WITHDRAWAL_STATUSES = ["pending", "processing", "completed", "failed"] as const;

/** Transitions allowed per project status. Key = from status, value = allowed next. */
export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  INQUIRY: ["AGREEMENT_PENDING", "CANCELLED"],
  AGREEMENT_PENDING: ["AGREEMENT_ACCEPTED", "CANCELLED"],
  AGREEMENT_ACCEPTED: ["ESCROW_PENDING", "CANCELLED"],
  ESCROW_PENDING: ["ESCROW_FUNDED", "IN_PROGRESS", "CANCELLED"],
  ESCROW_FUNDED: ["IN_PROGRESS", "DISPUTED"],
  IN_PROGRESS: ["DELIVERED", "DISPUTED"],
  DELIVERED: ["REVISION_REQUESTED", "APPROVED", "DISPUTED"],
  REVISION_REQUESTED: ["DELIVERED", "DISPUTED"],
  APPROVED: ["PAYMENT_RELEASED", "COMPLETED", "DISPUTED"],
  PAYMENT_RELEASED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: [],
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  INQUIRY: "Inquiry",
  AGREEMENT_PENDING: "Agreement pending",
  AGREEMENT_ACCEPTED: "Agreement accepted",
  ESCROW_PENDING: "Escrow pending",
  ESCROW_FUNDED: "Escrow funded",
  IN_PROGRESS: "In progress",
  DELIVERED: "Delivered",
  REVISION_REQUESTED: "Revision requested",
  APPROVED: "Approved",
  PAYMENT_RELEASED: "Payment released",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  INQUIRY: "bg-zinc-100 text-zinc-600",
  AGREEMENT_PENDING: "bg-amber-50 text-amber-700",
  AGREEMENT_ACCEPTED: "bg-amber-50 text-amber-700",
  ESCROW_PENDING: "bg-amber-50 text-amber-700",
  ESCROW_FUNDED: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  DELIVERED: "bg-violet-50 text-violet-700",
  REVISION_REQUESTED: "bg-orange-50 text-orange-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  PAYMENT_RELEASED: "bg-emerald-50 text-emerald-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-zinc-100 text-zinc-500",
  DISPUTED: "bg-red-50 text-red-700",
};

export const WITHDRAWAL_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function timeAgo(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}