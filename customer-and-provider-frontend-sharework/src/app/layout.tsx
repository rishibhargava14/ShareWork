import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionRefresh } from "@/components/session/SessionRefresh";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShareWork — Find Top Tech Talent for Fixed Price",
  description:
    "Chat directly, agree on scope, fund escrow. Payment releases only after you approve delivery. No bidding wars.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900" style={{ fontFamily: "Inter, sans-serif" }}>
        <SessionRefresh />
        {children}
      </body>
    </html>
  );
}