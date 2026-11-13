"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [msg, setMsg] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    const sb = supabaseBrowser();
    const { data, error } = mode === "in" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false);
    if (error) return setMsg(error.message);
    if (mode === "up" && !data.session) return setMsg("Check your email to confirm your account, then sign in.");
    router.push("/"); router.refresh();
  }
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="card w-full max-w-sm p-7 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{mode === "in" ? "Sign in" : "Create your account"}</h1>
        <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-ink-950 border border-ink-600 px-3 py-2.5 text-sm" />
        <input required minLength={8} type="password" placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg bg-ink-950 border border-ink-600 px-3 py-2.5 text-sm" />
        {msg && <p role="alert" className="text-sm text-amber-300">{msg}</p>}
        <button disabled={busy} className="w-full rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet py-2.5 text-sm font-medium text-white disabled:opacity-60">
          {busy ? "Working…" : mode === "in" ? "Sign in" : "Create account"}
        </button>
        <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="text-sm text-mist-300 hover:text-white">
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
