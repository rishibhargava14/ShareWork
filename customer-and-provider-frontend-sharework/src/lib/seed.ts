import bcryptjs from "bcryptjs";
import { connectDB } from "./db";
import User, { type PublicUser, toPublicUser } from "@/models/User";
import Service from "@/models/Service";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import Project from "@/models/Project";
import Agreement from "@/models/Agreement";
import Escrow from "@/models/Escrow";
import Delivery from "@/models/Delivery";
import Withdrawal from "@/models/Withdrawal";

let seeded = false;

export async function seed(): Promise<void> {
  if (seeded) return;
  await connectDB();
  const count = await User.countDocuments();
  if (count > 0) { seeded = true; return; }

  console.log("[seed] Seeding demo data…");

  const pw = await bcryptjs.hash("password123", 10);
  const adminPw = await bcryptjs.hash("admin123", 10);

  const [, providerDoc, provider2Doc, customerDoc] = await User.insertMany([
    { name: "Admin User", email: "admin@sharework.dev", passwordHash: adminPw, role: "admin", status: "active" },
    { name: "Maya Keller", email: "maia@sharework.dev", passwordHash: pw, role: "provider", title: "UI/UX Designer - SaaS & Dashboards", bio: "Fixed price expert. No hourly. I deliver production-ready code with docs, Figma, and deployment. Chat to scope, agree, escrow, deliver.", skills: ["React", "Tailwind CSS", "Figma", "TypeScript", "UI/UX"], location: "Bengaluru, IN", rating: 4.9, reviews: 112, online: true, availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { name: "Jordan Reeves", email: "jordan@sharework.dev", passwordHash: pw, role: "provider", title: "Full-Stack React & Node.js Expert", bio: "Fixed price expert. No hourly. I deliver production-ready APIs and Next.js apps.", skills: ["Node.js", "Next.js", "MongoDB", "TypeScript", "PostgreSQL"], location: "Pune, IN", rating: 4.8, reviews: 94, online: false, availabilityDays: ["Mon", "Wed", "Fri"] },
    { name: "Alex Morgan", email: "alex@sharework.dev", passwordHash: pw, role: "customer", title: "Startup Founder", skills: [], location: "Mumbai, IN", online: false, availabilityDays: [] },
    { name: "Aarav Mehta", email: "aarav@sharework.dev", passwordHash: pw, role: "provider", title: "Full-Stack React & Node.js Expert", bio: "Fixed price expert. No hourly. I deliver production-ready code with docs, Figma, and deployment.", skills: ["React", "Node.js", "TypeScript"], location: "Mumbai, IN", rating: 4.9, reviews: 86, online: true, availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { name: "Sara Khan", email: "sara@sharework.dev", passwordHash: pw, role: "provider", title: "Mobile App Developer - Flutter", bio: "Fixed price Flutter apps. No hourly.", skills: ["Flutter", "Dart", "Firebase"], location: "Delhi, IN", rating: 4.8, reviews: 64, online: true, availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { name: "Vikram Patel", email: "vikram@sharework.dev", passwordHash: pw, role: "provider", title: "AI/ML Engineer - LLMs & RAG", bio: "Fixed price LLM and RAG systems.", skills: ["Python", "RAG", "LangChain"], location: "Hyderabad, IN", rating: 4.9, reviews: 41, online: false, availabilityDays: ["Tue", "Wed", "Thu"] },
    { name: "Neha Singh", email: "neha@sharework.dev", passwordHash: pw, role: "provider", title: "UI/UX Designer - SaaS & Dashboards", bio: "SaaS dashboards and design systems. Fixed price only.", skills: ["Figma", "UI/UX", "Design Systems"], location: "Jaipur, IN", rating: 5, reviews: 73, online: true, availabilityDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] },
    { name: "Rohan Das", email: "rohan@sharework.dev", passwordHash: pw, role: "provider", title: "DevOps & Cloud Infrastructure", bio: "CI/CD, AWS, and infra. Fixed packages.", skills: ["AWS", "Docker", "Kubernetes"], location: "Kolkata, IN", rating: 4.7, reviews: 38, online: false, availabilityDays: ["Mon", "Wed", "Fri"] },
    { name: "Ishita Roy", email: "ishita@sharework.dev", passwordHash: pw, role: "provider", title: "Backend Engineer - APIs & Scale", bio: "APIs and scale. Fixed price.", skills: ["Go", "PostgreSQL", "Redis"], location: "Chennai, IN", rating: 4.8, reviews: 52, online: true, availabilityDays: ["Mon", "Tue", "Wed", "Thu"] },
  ]);

  const [provider, provider2, customer] = [providerDoc, provider2Doc, customerDoc];
  const extras = await User.find({ email: { $in: ["aarav@sharework.dev", "sara@sharework.dev", "vikram@sharework.dev", "neha@sharework.dev", "rohan@sharework.dev", "ishita@sharework.dev"] } }).lean();
  const byEmail = Object.fromEntries(extras.map((u) => [u.email, u]));

  const htmlPkgs = [
    { name: "Basic", price: 5000, deliveryDays: 5, description: "Core fixed-price deliverable", features: ["Scope as listed", "2 revisions"] },
    { name: "Standard", price: 15000, deliveryDays: 7, description: "Standard scope, 2 revisions", features: ["Priority chat", "2 revisions", "Source files"] },
    { name: "Premium", price: 35000, deliveryDays: 14, description: "Full package with dedicated support", features: ["Dedicated support", "Unlimited revisions"] },
  ];

  const serviceDocs = await Service.insertMany(([
    {
      provider: provider._id,
      title: "Figma to React Landing Page",
      description: "I will convert your Figma landing page into a pixel-perfect, responsive React + Tailwind component — fully accessible, with animations.",
      category: "Web Development",
      skills: ["React", "Tailwind CSS", "Figma"],
      tags: ["landing page", "conversion", "responsive"],
      price: 5000,
      deliveryDays: 5,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: provider._id,
      title: "SaaS Dashboard Development",
      description: "A polished admin/operator dashboard for your SaaS — charts, tables, user management, role-based views.",
      category: "Web Development",
      skills: ["React", "Next.js", "Tailwind CSS", "Chart.js"],
      tags: ["dashboard", "saas", "admin"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: provider._id,
      title: "Mobile App UI Kit",
      description: "High-fidelity React Native UI kit for iOS & Android — clean components, dark/light mode, screen library.",
      category: "Mobile Apps",
      skills: ["React Native", "Figma", "TypeScript", "UI/UX"],
      tags: ["mobile", "UI kit", "react native"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: provider2._id,
      title: "Node.js REST API Development",
      description: "I will build a production-ready Node.js + Express REST API with MongoDB, auth, validation, and deployment config.",
      category: "Cloud & DevOps",
      skills: ["Node.js", "Express", "MongoDB", "TypeScript"],
      tags: ["api", "backend", "rest"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: provider2._id,
      title: "Next.js E-Commerce Store",
      description: "A full-stack Next.js e-commerce storefront with Stripe checkout, product management, and order history.",
      category: "Web Development",
      skills: ["Next.js", "React", "TypeScript", "Stripe"],
      tags: ["ecommerce", "nextjs", "stripe"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: byEmail["aarav@sharework.dev"]?._id,
      title: "React SaaS Dashboard",
      description: "Fixed-price SaaS dashboard. Basic ₹5k / Standard ₹15k / Premium ₹35k.",
      category: "Web Development",
      skills: ["React", "Node.js", "TypeScript"],
      tags: ["saas", "dashboard"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: byEmail["sara@sharework.dev"]?._id,
      title: "Flutter Mobile App",
      description: "Fixed-price Flutter app. Basic ₹5k / Standard ₹15k / Premium ₹35k.",
      category: "Mobile Apps",
      skills: ["Flutter", "Dart", "Firebase"],
      tags: ["mobile", "flutter"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: byEmail["vikram@sharework.dev"]?._id,
      title: "AI Chatbot Integration",
      description: "LLM + RAG chatbot, fixed packages only.",
      category: "AI & Automation",
      skills: ["Python", "RAG", "LangChain"],
      tags: ["ai", "rag"],
      price: 35000,
      deliveryDays: 14,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: byEmail["neha@sharework.dev"]?._id,
      title: "SaaS Dashboard Design",
      description: "UI/UX for SaaS dashboards. Fixed price.",
      category: "Design & UX",
      skills: ["Figma", "UI/UX"],
      tags: ["design", "saas"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: byEmail["rohan@sharework.dev"]?._id,
      title: "Cloud Infrastructure Setup",
      description: "AWS, Docker, CI/CD. Fixed packages.",
      category: "Cloud & DevOps",
      skills: ["AWS", "Docker", "Kubernetes"],
      tags: ["devops", "cloud"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
    {
      provider: byEmail["ishita@sharework.dev"]?._id,
      title: "Backend API Scale",
      description: "APIs and scale. Fixed price only.",
      category: "Web Development",
      skills: ["Go", "PostgreSQL", "Redis"],
      tags: ["api", "backend"],
      price: 15000,
      deliveryDays: 7,
      active: true,
      packages: htmlPkgs,
    },
  ] as Array<Record<string, unknown>>).filter((s) => s.provider));

  // Conversation Alex ↔ Maya with sample messages
  const conv = await Conversation.create({
    participants: [customer._id, provider._id],
    service: serviceDocs[0]._id,
    lastMessageAt: new Date(),
    lastMessagePreview: "Sounds good, let's start the project.",
  });

  await Message.insertMany([
    { conversation: conv._id, sender: customer._id, content: "Hi Maya! I need a landing page for my SaaS product. Can you handle a Figma to React conversion?", readBy: [customer._id, provider._id] },
    { conversation: conv._id, sender: provider._id, content: "Hi Alex! Absolutely — that's exactly what I specialize in. Could you share the Figma link so I can take a look?", readBy: [customer._id, provider._id] },
    { conversation: conv._id, sender: customer._id, content: "Great! Here's the link. I'm thinking the Standard package — one responsive page, dark mode. Budget around ₹15,000. Timeline 7 days work?", readBy: [customer._id, provider._id] },
    { conversation: conv._id, sender: provider._id, content: "That works perfectly for the Basic package. I can deliver in 5 days. Let me create the project and agreement.", readBy: [customer._id, provider._id] },
    { conversation: conv._id, sender: provider._id, content: "Sounds good, let's start the project.", readBy: [customer._id, provider._id] },
  ]);

  // Project in IN_PROGRESS (agreement accepted, escrow funded)
  const project = await Project.create({
    customer: customer._id,
    provider: provider._id,
    service: serviceDocs[0]._id,
    conversation: conv._id,
    title: "Figma to React Landing Page — Alex Morgan",
    description: "Convert the provided Figma design into a responsive React + Tailwind landing page. Dark mode, accessible, with smooth animations.",
    status: "IN_PROGRESS",
    price: 15000,
    timelineDays: 7,
  });

  await Agreement.create({
    project: project._id,
    scope: "Figma to React landing page conversion. Dark mode, responsive, accessible. 2 revisions included.",
    price: 15000,
    timelineDays: 7,
    status: "accepted",
    proposedBy: provider._id,
    acceptedAt: new Date(),
  });

  await Escrow.create({
    project: project._id,
    amount: 15000,
    status: "funded",
    fundedAt: new Date(),
  });

  await conv.updateOne({ project: project._id });

  // Second project Alex ↔ Jordan — completed
  const conv2 = await Conversation.create({
    participants: [customer._id, provider2._id],
    service: serviceDocs[3]._id,
    lastMessageAt: new Date(Date.now() - 7 * 24 * 3600_000),
    lastMessagePreview: "Project completed — thank you!",
  });

  await Message.create({ conversation: conv2._id, sender: customer._id, content: "Jordan, I need a REST API built for my SaaS. Node.js, MongoDB, auth, 5 endpoints. Budget ₹15,000.", readBy: [customer._id, provider2._id] });
  await Message.create({ conversation: conv2._id, sender: provider2._id, content: "I can deliver that in 7 days. Let me set up the project.", readBy: [customer._id, provider2._id] });

  const project2 = await Project.create({
    customer: customer._id,
    provider: provider2._id,
    service: serviceDocs[3]._id,
    conversation: conv2._id,
    title: "Node.js REST API — Alex Morgan",
    description: "REST API with JWT auth, user endpoints, MongoDB, deployment config.",
    status: "COMPLETED",
    price: 15000,
    timelineDays: 7,
  });

  await Agreement.create({
    project: project2._id,
    scope: "REST API: JWT auth, 5 core endpoints, MongoDB, Express, tests, docs.",
    price: 15000,
    timelineDays: 7,
    status: "accepted",
    proposedBy: customer._id,
    acceptedAt: new Date(Date.now() - 10 * 24 * 3600_000),
  });

  await Escrow.create({
    project: project2._id,
    amount: 15000,
    status: "released",
    fundedAt: new Date(Date.now() - 10 * 24 * 3600_000),
    releasedAt: new Date(Date.now() - 2 * 24 * 3600_000),
  });

  await Delivery.create({
    project: project2._id,
    sender: provider2._id,
    message: "API is deployed. Here are the docs: https://docs.example.com",
    status: "approved",
    approvedAt: new Date(Date.now() - 2 * 24 * 3600_000),
  });

  await Withdrawal.create({
    provider: provider2._id,
    amount: 8000,
    payoutMethod: "Bank transfer (demo)",
    status: "completed",
    resolvedAt: new Date(),
  });

  seeded = true;
  console.log("[seed] Demo data seeded: admin@sharework.dev, maia@sharework.dev, jordan@sharework.dev, alex@sharework.dev (all password: password123)");
}

export async function getDemoUsers(): Promise<{ admin: PublicUser; provider: PublicUser; provider2: PublicUser; customer: PublicUser }> {
  const [adminDoc, p1Doc, p2Doc, cDoc] = await Promise.all([
    User.findOne({ email: "admin@sharework.dev" }).lean(),
    User.findOne({ email: "maia@sharework.dev" }).lean(),
    User.findOne({ email: "jordan@sharework.dev" }).lean(),
    User.findOne({ email: "alex@sharework.dev" }).lean(),
  ]);
  return {
    admin: toPublicUser(adminDoc!),
    provider: toPublicUser(p1Doc!),
    provider2: toPublicUser(p2Doc!),
    customer: toPublicUser(cDoc!),
  };
}