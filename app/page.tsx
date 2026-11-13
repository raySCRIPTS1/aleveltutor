import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { SUBJECTS, TOPICS } from "@/lib/topics";
import { bandFor } from "@/lib/mastery";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const since = new Date(Date.now() - 6 * 864e5); since.setHours(0, 0, 0, 0);
  const [{ data: mastery }, { data: convos }, { data: attempts }] = await Promise.all([
    sb.from("topic_mastery").select("subject,topic,score,attempts,last_mistake"),
    sb.from("conversations").select("id,title,subject,mode,updated_at").order("updated_at", { ascending: false }).limit(5),
    sb.from("attempts").select("created_at,correct").gte("created_at", since.toISOString()),
  ]);
  const rows = mastery ?? [];
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(since); d.setDate(d.getDate() + i); return d; });
  const perDay = days.map((d) => (attempts ?? []).filter((a) => new Date(a.created_at).toDateString() === d.toDateString()).length);
  const maxDay = Math.max(1, ...perDay);
  let streak = 0;
  for (let i = 6; i >= 0; i--) { if (perDay[i] > 0) streak++; else if (i !== 6) break; }
  const weakest = rows.filter((r) => r.attempts > 0).sort((a, b) => a.score - b.score).slice(0, 5);
  const hour = new Date().getHours();

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">{hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"}</h1>
        <p className="text-mist-300 mt-1">{user?.email}</p>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        {SUBJECTS.map((s) => {
          const r = rows.filter((x) => x.subject === s);
          const covered = r.filter((x) => x.attempts > 0).length;
          const avg = r.length ? Math.round(r.reduce((t, x) => t + x.score, 0) / TOPICS[s].length) : 0;
          const band = bandFor(avg, covered);
          return (
            <Link key={s} href="/tutor" className="card p-5 hover:border-white/15 transition-colors">
              <div className="flex items-baseline justify-between"><h2 className="font-medium">{s}</h2><span className="text-2xl font-semibold" style={{ color: band.color }}>{avg}%</span></div>
              <div className="h-1.5 rounded-full bg-ink-600 mt-3 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${avg}%`, background: band.color }} /></div>
              <p className="text-xs text-mist-500 mt-2">{band.label}. {covered} of {TOPICS[s].length} topics assessed</p>
            </Link>
          );
        })}
      </section>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="card p-5 md:col-span-2">
          <div className="flex items-baseline justify-between mb-4"><h2 className="font-medium">Questions assessed, last 7 days</h2><span className="text-sm text-mist-300">{streak}-day streak</span></div>
          <div className="flex items-end gap-3 h-32" role="img" aria-label="Questions assessed per day">
            {perDay.map((n, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="w-full rounded-t bg-gradient-to-t from-accent-blue/40 to-accent-cyan/80" style={{ height: `${(n / maxDay) * 100}%`, minHeight: n ? 4 : 2, opacity: n ? 1 : 0.25 }} title={`${n}`} />
                <span className="text-[11px] text-mist-500">{days[i].toLocaleDateString("en-GB", { weekday: "short" })}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h2 className="font-medium mb-3">Weakest topics</h2>
          {weakest.length === 0 ? <p className="text-sm text-mist-300">Nothing assessed yet. Answer a few tutor questions and your weak spots will show up here.</p> : (
            <ul className="space-y-3">{weakest.map((w) => (
              <li key={w.subject + w.topic}><div className="flex justify-between text-sm"><span>{w.topic}</span><span style={{ color: bandFor(w.score, w.attempts).color }}>{Math.round(w.score)}%</span></div><p className="text-xs text-mist-500">{w.subject}</p></li>
            ))}</ul>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-medium mb-3">Recent conversations</h2>
        {(convos ?? []).length === 0 ? <p className="text-sm text-mist-300">No conversations yet. <Link href="/tutor" className="text-accent-blue">Start with the tutor</Link>.</p> : (
          <ul className="divide-y divide-white/5">{convos!.map((c) => (
            <li key={c.id}><Link href={`/tutor?c=${c.id}`} className="flex justify-between py-2.5 text-sm hover:text-white text-mist-100"><span className="truncate">{c.title}</span><span className="text-mist-500 shrink-0 ml-4">{c.subject}, {c.mode}</span></Link></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
