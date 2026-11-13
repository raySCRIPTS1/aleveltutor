import type { Metadata } from "next";
import { Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const sans = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-sans" });
export const metadata: Metadata = { title: "A-Level Tutor", description: "Your personal AI tutor and study command centre" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={sans.variable}>
      <body className="antialiased">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
