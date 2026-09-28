"use client";

import { useEffect, type ReactNode } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";
import AuthForm from "@/components/auth/AuthForm";
import { AppShell } from "@/components/app/AppShell";
import BrowsePage from "@/components/app/BrowsePage";
import ProviderProfilePage from "@/components/app/ProviderProfilePage";
import ConversationDetailPage from "@/components/app/ConversationDetailPage";
import ProjectsList from "@/components/app/ProjectsList";
import ProjectDetailPage from "@/components/app/ProjectDetailPage";
import RequirementsPage from "@/components/app/RequirementsPage";
import { EarningsView } from "@/components/app/EarningsView";
import { AvailabilityView } from "@/components/app/AvailabilityView";
import { PaymentsView } from "@/components/app/PaymentsView";
import ProviderDashboard from "@/components/app/ProviderDashboard";
import ProfileForm from "@/components/app/ProfileForm";
import { SpaProvider, useSpaNav } from "@/components/app/SpaNav";
import { useSessionState } from "@/components/session/use-session";
import { connectChatSocket, disconnectChatSocket, joinConversationRoom } from "@/lib/socket";
import { api } from "@/lib/api";
import type { ExpressConversation } from "@/lib/express";

function Landing() {
  return (
    <div className="min-h-screen bg-white text-zinc-900" style={{ fontFamily: "Inter, sans-serif" }}>
      <Header />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}

function AuthModal() {
  const spa = useSpaNav();

  useEffect(() => {
    if (!spa.authOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") spa.closeAuth();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [spa.authOpen, spa]);

  if (!spa.authOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={spa.authMode === "login" ? "Sign in" : "Join ShareWork"}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={spa.closeAuth}
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />
      <div className="relative w-full max-w-[400px] max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-[16px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
        <button
          type="button"
          onClick={spa.closeAuth}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        >
          ✕
        </button>
        <AuthForm key={spa.authMode} initialMode={spa.authMode} />
      </div>
    </div>
  );
}

const CUSTOMER_ONLY_VIEWS = new Set(["discover", "freelancer", "payments", "requirements"]);
const PROVIDER_ONLY_VIEWS = new Set(["dashboard", "gigs", "earnings", "availability"]);

function ChatSocketGate() {
  const session = useSessionState();

  useEffect(() => {
    if (!session?.user.id) {
      disconnectChatSocket();
      return undefined;
    }
    const socket = connectChatSocket();
    if (session.user.role === "provider") {
      socket?.emit("update_online_status", { status: "online" });
    }
    let active = true;
    const joinRooms = () => {
      void api<{ conversations: ExpressConversation[] }>("/api/conversations")
        .then((res) => {
          if (!active) return;
          for (const item of res.conversations ?? []) joinConversationRoom(item.id);
        })
        .catch(() => {
          /* REST chat screens still work if the socket cannot join yet. */
        });
    };
    joinRooms();
    socket?.on("connect", joinRooms);
    return () => {
      active = false;
      socket?.off("connect", joinRooms);
    };
  }, [session?.user.id, session?.user.role]);

  return null;
}

function Workspace() {
  const spa = useSpaNav();
  const session = useSessionState();
  const role = session?.user.role;

  useEffect(() => {
    if (!role || role === "admin") return;
    if (role === "customer" && PROVIDER_ONLY_VIEWS.has(spa.view)) spa.setView("discover");
    if (role === "provider" && CUSTOMER_ONLY_VIEWS.has(spa.view)) spa.setView("dashboard");
  }, [role, spa]);

  let body: ReactNode = null;
  if (spa.view === "discover") body = <BrowsePage />;
  else if (spa.view === "freelancer") body = <ProviderProfilePage id={spa.expertName} />;
  else if (spa.view === "messages") body = <ConversationDetailPage id={spa.inboxName} />;
  else if (spa.view === "projects") {
    body = spa.projectId ? (
      <ProjectDetailPage id={spa.projectId} onBack={() => spa.setView("projects")} />
    ) : (
      <ProjectsList role={role === "provider" ? "provider" : "customer"} />
    );
  }
  else if (spa.view === "payments") body = <PaymentsView />;
  else if (spa.view === "requirements") body = <RequirementsPage />;
  else if (spa.view === "dashboard") body = <ProviderDashboard tab="overview" />;
  else if (spa.view === "gigs") body = <ProviderDashboard tab="services" />;
  else if (spa.view === "earnings") body = <EarningsView />;
  else if (spa.view === "availability") body = <AvailabilityView />;
  else if (spa.view === "profile") {
    body = (
      <div className="max-w-[600px] p-6">
        <h1 className="text-[22px] font-bold">Profile</h1>
        <div className="mt-6">
          <ProfileForm />
        </div>
      </div>
    );
  }

  return <AppShell>{body}</AppShell>;
}

function Root() {
  const spa = useSpaNav();
  if (spa.screen === "landing") return <Landing />;
  return <Workspace />;
}

export default function ShareWorkSpa() {
  return (
    <SpaProvider>
      <ChatSocketGate />
      <Root />
      <AuthModal />
    </SpaProvider>
  );
}
