"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

// Hides the progress-tracking tag while it streams in.
const strip = (s: string) => s.replace(/<assessment>[\s\S]*?(<\/assessment>|$)/g, "").trim();

export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-tutor text-[15px]">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{strip(children)}</ReactMarkdown>
    </div>
  );
}
