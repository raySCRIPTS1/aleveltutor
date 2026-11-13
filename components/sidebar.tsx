"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutDashboard, GraduationCap, PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tutor", label: "Tutor", icon: GraduationCap },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  if (path.startsWith("/login")) return null;

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/login"); router.refresh();
  }
  return (
    <motion.aside animate={{ width: open ? 220 : 64 }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="shrink-0 border-r border-white/5 bg-ink-900/70 backdrop-blur flex flex-col py-4 px-2">
      <div className="flex items-center justify-between px-2 mb-6 h-8">
        {open && <span className="font-semibold tracking-tight bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">A-Level Tutor</span>}
        <button aria-label={open ? "Collapse sidebar" : "Expand sidebar"} onClick={() => setOpen(!open)} className="p-1.5 rounded-md text-mist-300 hover:bg-white/5">
          {open ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
        </button>
      </div>
      <nav className="flex-1 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} title={label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${active ? "bg-white/8 text-white" : "text-mist-300 hover:bg-white/5 hover:text-white"}`}>
              <Icon size={18} className={active ? "text-accent-blue" : ""} />{open && label}
            </Link>
          );
        })}
      </nav>
      <button onClick={signOut} title="Sign out" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-mist-500 hover:bg-white/5 hover:text-white">
        <LogOut size={18} />{open && "Sign out"}
      </button>
    </motion.aside>
  );
}
