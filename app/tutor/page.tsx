"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bookmark, Copy, ImagePlus, Plus, RefreshCw, SendHorizontal, X } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SUBJECTS, type Subject } from "@/lib/topics";
import { MODES, type Mode } from "@/lib/tutor";
import { Markdown } from "@/components/markdown";

type Msg = { id?: string; role: "user" | "assistant"; content: string; bookmarked?: boolean };
type Convo = { id: string; title: string; subject: Subject; mode: Mode };
type Img = { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string; url: string };

const toImg = (f: File) => new Promise<Img>((res, rej) => {
  const r = new FileReader();
  r.onload = () => { const url = r.result as string; res({ mediaType: f.type as Img["mediaType"], data: url.split(",")[1], url }); };
  r.onerror = () => rej(new Error("Could not read image")); r.readAsDataURL(f);
});

function Tutor() {
  const sb = useRef(supabaseBrowser()).current;
  const params = useSearchParams();
  const [convos, setConvos] = useState<Convo[]>([]);
  const [cid, setCid] = useState<string | undefined>(params.get("c") ?? undefined);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [subject, setSubject] = useState<Subject>("Mathematics");
  const [mode, setMode] = useState<Mode>("teaching");
  const [text, setText] = useState(""); const [images, setImages] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(async () => {
    const { data } = await sb.from("conversations").select("id,title,subject,mode").order("updated_at", { ascending: false });
    setConvos((data as Convo[]) ?? []);
  }, [sb]);
  useEffect(() => { loadConvos(); }, [loadConvos]);

  useEffect(() => {
    if (!cid) { setMsgs([]); return; }
    sb.from("messages").select("id,role,content,bookmarked").eq("conversation_id", cid).order("created_at").then(({ data, error }) => {
      if (error) setErr(error.message); else setMsgs((data as Msg[]) ?? []);
    });
    const c = convos.find((x) => x.id === cid); if (c) { setSubject(c.subject); setMode(c.mode); }
  }, [cid, sb]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function run(opts: { regenerate?: boolean }) {
    setBusy(true); setErr(null);
    const sendText = opts.regenerate ? "" : text, sendImgs = opts.regenerate ? [] : images;
    if (!opts.regenerate) { setMsgs((m) => [...m, { role: "user", content: sendText + (sendImgs.length ? `\n\n[${sendImgs.length} image(s) attached]` : "") }, { role: "assistant", content: "" }]); setText(""); setImages([]); }
    else setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: cid, subject, mode, text: sendText, images: sendImgs.map(({ mediaType, data }) => ({ mediaType, data })), regenerate: opts.regenerate }) });
      if (!res.ok || !res.body) throw new Error(await res.text() || "Request failed");
      const newId = res.headers.get("X-Conversation-Id"); if (newId && !cid) setCid(newId);
      const reader = res.body.getReader(), dec = new TextDecoder(); let acc = "";
      for (;;) { const { done, value } = await reader.read(); if (done) break; acc += dec.decode(value, { stream: true }); setMsgs((m) => [...m.slice(0, -1), { role: "assistant", content: acc }]); }
      loadConvos();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong."); setMsgs((m) => (m[m.length - 1]?.content === "" ? m.slice(0, -1) : m));
    } finally { setBusy(false); }
  }

  async function bookmark(i: number) {
    const m = msgs[i]; if (!m.id) return;
    const next = !m.bookmarked;
    setMsgs((all) => all.map((x, j) => (j === i ? { ...x, bookmarked: next } : x)));
    await sb.from("messages").update({ bookmarked: next }).eq("id", m.id);
  }

  return (
    <div className="flex h-screen">
      <div className="w-60 shrink-0 border-r border-white/5 p-3 overflow-y-auto hidden md:block">
        <button onClick={() => { setCid(undefined); setMsgs([]); }} className="w-full flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"><Plus size={16} />New conversation</button>
        <ul className="mt-3 space-y-0.5">
          {SUBJECTS.map((s) => convos.filter((c) => c.subject === s).length > 0 && (
            <li key={s}><p className="text-xs text-mist-500 px-2 pt-3 pb-1">{s}</p>
              {convos.filter((c) => c.subject === s).map((c) => (
                <button key={c.id} onClick={() => setCid(c.id)} className={`w-full text-left truncate rounded-md px-2 py-1.5 text-sm ${c.id === cid ? "bg-white/8 text-white" : "text-mist-300 hover:bg-white/5"}`}>{c.title}</button>
              ))}
            </li>
          ))}
        </ul>
      </div>

      <section className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-5 py-3">
          <select aria-label="Subject" disabled={!!cid} value={subject} onChange={(e) => setSubject(e.target.value as Subject)} className="rounded-lg bg-ink-800 border border-ink-600 px-3 py-1.5 text-sm disabled:opacity-60">
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
          <div className="flex gap-1 flex-wrap" role="group" aria-label="Tutoring mode">
            {(Object.keys(MODES) as Mode[]).map((k) => (
              <button key={k} onClick={() => setMode(k)} aria-pressed={mode === k} className={`rounded-full px-3 py-1 text-xs transition-colors ${mode === k ? "bg-accent-blue/20 text-accent-blue ring-1 ring-accent-blue/40" : "text-mist-300 hover:bg-white/5"}`}>{MODES[k].label}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {msgs.length === 0 && <p className="text-mist-300 pt-16 text-center">Ask anything about {subject}, paste a question, or attach a photo of your working.</p>}
            {msgs.map((m, i) => m.role === "user" ? (
              <div key={i} className="flex justify-end"><div className="rounded-2xl bg-ink-700 px-4 py-2.5 max-w-[85%] whitespace-pre-wrap text-[15px]">{m.content}</div></div>
            ) : (
              <div key={i} className="group">
                {m.content ? <Markdown>{m.content}</Markdown> : <span className="text-mist-500 text-sm">Thinking…</span>}
                {m.content && !busy && (
                  <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity text-mist-500">
                    <button aria-label="Copy" onClick={() => navigator.clipboard.writeText(m.content)} className="p-1.5 rounded hover:bg-white/5 hover:text-white"><Copy size={15} /></button>
                    <button aria-label="Bookmark" onClick={() => bookmark(i)} className={`p-1.5 rounded hover:bg-white/5 ${m.bookmarked ? "text-accent-violet" : "hover:text-white"}`}><Bookmark size={15} fill={m.bookmarked ? "currentColor" : "none"} /></button>
                    {i === msgs.length - 1 && <button aria-label="Regenerate" onClick={() => run({ regenerate: true })} className="p-1.5 rounded hover:bg-white/5 hover:text-white"><RefreshCw size={15} /></button>}
                  </div>
                )}
              </div>
            ))}
            {err && <p role="alert" className="text-sm text-amber-300 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3">{err}</p>}
            <div ref={endRef} />
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="max-w-3xl mx-auto card p-2">
            {images.length > 0 && <div className="flex gap-2 p-2">{images.map((im, i) => (
              <div key={i} className="relative"><img src={im.url} alt="Attached working" className="h-16 rounded-md" /><button aria-label="Remove image" onClick={() => setImages(images.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-ink-600 rounded-full p-0.5"><X size={12} /></button></div>
            ))}</div>}
            <div className="flex items-end gap-1">
              <label className="p-2 rounded-lg text-mist-300 hover:bg-white/5 cursor-pointer" title="Attach a photo of your working">
                <ImagePlus size={20} />
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden onChange={async (e) => { const fs = Array.from(e.target.files ?? []).slice(0, 4); try { setImages([...images, ...(await Promise.all(fs.map(toImg)))].slice(0, 4)); } catch { setErr("Could not read that image."); } e.target.value = ""; }} />
              </label>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder={`Ask your ${MODES[mode].label.toLowerCase()} tutor…`}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!busy && (text.trim() || images.length)) run({}); } }}
                className="flex-1 resize-none bg-transparent px-2 py-2.5 text-[15px] outline-none max-h-40" />
              <button aria-label="Send" disabled={busy || (!text.trim() && !images.length)} onClick={() => run({})} className="p-2.5 rounded-lg bg-gradient-to-r from-accent-blue to-accent-violet text-white disabled:opacity-40"><SendHorizontal size={18} /></button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Page() { return <Suspense><Tutor /></Suspense>; }
