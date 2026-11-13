import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase/server";
import { buildSystemPrompt, MODES, type Mode } from "@/lib/tutor";
import { SUBJECTS, TOPICS, type Subject } from "@/lib/topics";
import { nextScore } from "@/lib/mastery";

export const runtime = "nodejs";
export const maxDuration = 120;

type Img = { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string };

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) return new Response("ANTHROPIC_API_KEY is not set on the server.", { status: 500 });
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new Response("Not signed in.", { status: 401 });

  const body = (await req.json()) as { conversationId?: string; subject: Subject; mode: Mode; text: string; images?: Img[]; regenerate?: boolean };
  if (!SUBJECTS.includes(body.subject) || !(body.mode in MODES)) return new Response("Bad subject or mode.", { status: 400 });

  // Conversation
  let convoId = body.conversationId;
  if (!convoId) {
    const { data, error } = await sb.from("conversations")
      .insert({ user_id: user.id, subject: body.subject, mode: body.mode, title: body.text.slice(0, 60) || "Uploaded working" })
      .select("id").single();
    if (error) return new Response(error.message, { status: 500 });
    convoId = data.id;
  } else if (body.regenerate) {
    const { data: last } = await sb.from("messages").select("id,role").eq("conversation_id", convoId).order("created_at", { ascending: false }).limit(1);
    if (last?.[0]?.role === "assistant") await sb.from("messages").delete().eq("id", last[0].id);
  }
  if (!body.regenerate) {
    await sb.from("messages").insert({ conversation_id: convoId, user_id: user.id, role: "user", content: body.images?.length ? `${body.text}\n\n[${body.images.length} image(s) attached]` : body.text });
  }

  // Context: history, settings, mastery
  const [{ data: history }, { data: st }, { data: mastery }, { data: attempts }] = await Promise.all([
    sb.from("messages").select("role,content").eq("conversation_id", convoId).order("created_at").limit(40),
    sb.from("tutor_settings").select("*").eq("user_id", user.id).maybeSingle(),
    sb.from("topic_mastery").select("topic,score,attempts,last_mistake").eq("user_id", user.id).eq("subject", body.subject),
    sb.from("attempts").select("topic,note").eq("user_id", user.id).eq("subject", body.subject).eq("correct", false).not("note", "is", null).order("created_at", { ascending: false }).limit(5),
  ]);
  const settings = st ?? { personality: "warm and encouraging, but exacting", depth: "standard", difficulty: "adaptive", boards: { Mathematics: "Edexcel", "Further Mathematics": "Edexcel", Physics: "AQA" } };
  const system = buildSystemPrompt({ subject: body.subject, mode: body.mode, settings, mastery: mastery ?? [], recentMistakes: (attempts ?? []).map((a) => `${a.topic}: ${a.note}`) });

  const messages: Anthropic.MessageParam[] = (history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
  if (body.images?.length && !body.regenerate) {
    const lastIdx = messages.length - 1;
    messages[lastIdx] = { role: "user", content: [
      ...body.images.map((i) => ({ type: "image" as const, source: { type: "base64" as const, media_type: i.mediaType, data: i.data } })),
      { type: "text" as const, text: body.text || "Please check my working." },
    ] };
  }

  const client = new Anthropic();
  const encoder = new TextEncoder();
  let full = "";
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const s = client.messages.stream({ model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6", max_tokens: 2500, system, messages });
        s.on("text", (t) => { full += t; controller.enqueue(encoder.encode(t)); });
        await s.finalMessage();

        const m = full.match(/<assessment>([\s\S]*?)<\/assessment>/);
        const clean = full.replace(/<assessment>[\s\S]*?<\/assessment>/g, "").trim();
        await sb.from("messages").insert({ conversation_id: convoId, user_id: user.id, role: "assistant", content: clean });
        await sb.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

        if (m) {
          try {
            const a = JSON.parse(m[1]) as { topic: string; correct: boolean; understanding: "concept" | "memorised" | "unclear"; note?: string };
            if (TOPICS[body.subject].includes(a.topic)) {
              await sb.from("attempts").insert({ user_id: user.id, subject: body.subject, topic: a.topic, correct: !!a.correct, understanding: a.understanding, note: a.note || null });
              const { data: cur } = await sb.from("topic_mastery").select("*").eq("user_id", user.id).eq("subject", body.subject).eq("topic", a.topic).maybeSingle();
              const prev = cur?.score ?? 0, n = cur?.attempts ?? 0;
              await sb.from("topic_mastery").upsert({
                user_id: user.id, subject: body.subject, topic: a.topic,
                score: nextScore(prev, n, !!a.correct, a.understanding), attempts: n + 1, correct: (cur?.correct ?? 0) + (a.correct ? 1 : 0),
                last_mistake: a.correct ? (cur?.last_mistake ?? null) : a.note || cur?.last_mistake || null, updated_at: new Date().toISOString(),
              });
            }
          } catch { /* malformed assessment: ignore, the reply is already saved */ }
        }
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(`\n\n[Error: ${e instanceof Error ? e.message : "the tutor could not respond"}]`));
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Conversation-Id": convoId!, "Cache-Control": "no-store" } });
}
