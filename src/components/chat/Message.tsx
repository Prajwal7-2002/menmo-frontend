"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BookOpen,
  Brain,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Globe,
  Lightbulb,
  MessageCircle,
  RotateCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import type { ChatResponse, Chunk } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: ChatResponse; // assistant answers: source, tone, sources, query id (also restored from history)
  feedback?: "up" | "down";
  error?: boolean;
  retryText?: string;
}

const SOURCE_LABEL: Record<string, { label: string; icon: typeof Globe; className: string }> = {
  document: { label: "From your documents", icon: BookOpen, className: "bg-accent-soft text-accent" },
  web: { label: "From the web", icon: Globe, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  llm: { label: "General knowledge", icon: Lightbulb, className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  memory: { label: "From memory", icon: Brain, className: "bg-ok/10 text-ok" },
  chat: { label: "Conversation", icon: MessageCircle, className: "bg-surface-2 text-muted" },
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Turn "[2]" into a link the custom renderer below recognises. */
function linkCitations(text: string, count: number, id: string) {
  if (!count) return text;
  return text.replace(/\[(\d{1,2})\](?!\()/g, (m, n) =>
    Number(n) >= 1 && Number(n) <= count ? `[${n}](#cite-${id}-${n})` : m,
  );
}

// Same cut-offs the backend uses to decide whether documents answer the question
// (RAG_MIN_GOOD_SIM / RAG_MIN_WEAK_SIM).
const STRONG = 0.45;
const PARTIAL = 0.3;

/** How closely a source matches the question, 0..1, or null if unscored (e.g. web results). */
export function relevance(chunk: Chunk): number | null {
  if (typeof chunk.similarity === "number") return chunk.similarity;
  // Older backends only send the hybrid ranking score
  if (typeof chunk.score === "number" && chunk.score > 0) return chunk.score;
  return null;
}

function RelevanceTag({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  const tier =
    value >= STRONG
      ? { label: "Strong", text: "text-ok", bar: "bg-ok" }
      : value >= PARTIAL
        ? { label: "Partial", text: "text-amber-600 dark:text-amber-400", bar: "bg-amber-500" }
        : { label: "Weak", text: "text-muted", bar: "bg-muted" };
  return (
    <span
      className="ml-auto inline-flex items-center gap-2 text-xs"
      title="How closely this passage matches your question"
    >
      <span className={`font-medium ${tier.text}`}>
        {tier.label} · {pct}%
      </span>
      <span className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <span className={`block h-full rounded-full ${tier.bar}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function SourceItem({ chunk, n, anchor }: { chunk: Chunk; n: number; anchor: string }) {
  const meta = chunk.meta ?? {};
  const isWeb = meta.type === "web" || (!!meta.source && meta.source.startsWith("http"));
  const title = meta.title || (isWeb ? meta.source : "Document");
  const where = [meta.page_num ? `p. ${meta.page_num}` : "", meta.section_title || ""].filter(Boolean).join(" · ");
  const score = relevance(chunk);

  return (
    <li id={anchor} className="scroll-mt-24 rounded-lg border border-border bg-surface p-3 text-sm target:ring-2 target:ring-accent/40">
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="grid size-5 shrink-0 place-items-center rounded bg-surface-2 text-xs font-semibold text-muted">{n}</span>
        {isWeb && meta.source ? (
          <a href={meta.source} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 font-medium text-accent hover:underline">
            <span className="truncate">{title}</span>
            <ExternalLink className="size-3 shrink-0" />
          </a>
        ) : (
          <span className="min-w-0 truncate font-medium">{title}</span>
        )}
        {where && <span className="text-xs text-muted">{where}</span>}
        {score !== null ? (
          <RelevanceTag value={score} />
        ) : (
          isWeb && <span className="ml-auto text-xs text-muted">Web result</span>
        )}
      </div>
      <p className="line-clamp-4 whitespace-pre-line text-muted">{chunk.text}</p>
    </li>
  );
}

export function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-accent to-accent-2 px-4 py-2.5 whitespace-pre-wrap text-white shadow-sm">
        {message.content}
      </div>
    </div>
  );
}

export function AssistantMessage({
  message,
  onFeedback,
  onRetry,
}: {
  message: ChatMessage;
  onFeedback: (id: string, value: "up" | "down") => void;
  onRetry: (text: string) => void;
}) {
  const [showSources, setShowSources] = useState(false);
  const meta = message.meta;
  const chunks = meta?.chunks?.filter((c) => c.text) ?? [];
  const scores = chunks.map(relevance).filter((s): s is number => s !== null);
  const best = scores.length ? Math.max(...scores) : null;
  const badge = meta ? SOURCE_LABEL[meta.source] : undefined;
  const steps = (meta?.trace ?? []).map((t) => String(t.step)).filter(Boolean);

  if (message.error) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
        <CircleAlert className="mt-0.5 size-4 shrink-0" />
        <div className="flex-1">{message.content}</div>
        {message.retryText && (
          <button onClick={() => onRetry(message.retryText!)} className="inline-flex items-center gap-1 font-medium hover:underline">
            <RotateCw className="size-3.5" /> Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {meta && (
        <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs" aria-label="Answer details">
          {badge && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${badge.className}`}>
              <badge.icon className="size-3" /> {badge.label}
            </span>
          )}
          {meta.tone && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted" title="Tone of this answer">
              Tone · {capitalize(meta.tone)}
            </span>
          )}
          {meta.verbosity && meta.verbosity !== "normal" && (
            <span className="rounded-full border border-border px-2 py-0.5 text-muted" title="Answer length">
              {capitalize(meta.verbosity)}
            </span>
          )}
        </div>
      )}

      <div className="answer prose prose-sm max-w-none sm:prose-base dark:prose-invert">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ href, children }) => {
              if (href?.startsWith("#cite-")) {
                return (
                  <a
                    href={href}
                    onClick={() => setShowSources(true)}
                    className="mx-0.5 inline-grid min-w-5 place-items-center rounded bg-accent-soft px-1 align-super text-[0.7em] font-semibold text-accent no-underline hover:bg-accent hover:text-white"
                  >
                    {children}
                  </a>
                );
              }
              return (
                <a href={href} target="_blank" rel="noreferrer">
                  {children}
                </a>
              );
            },
          }}
        >
          {linkCitations(message.content, meta?.chunks?.length ?? 0, message.id)}
        </ReactMarkdown>
      </div>

      {meta && (
        <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted">
          {chunks.length > 0 && (
            <button
              onClick={() => setShowSources((s) => !s)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 hover:bg-surface-2 hover:text-fg"
              aria-expanded={showSources}
            >
              {chunks.length} source{chunks.length > 1 ? "s" : ""}
              {best !== null && <span className="text-muted">· best {Math.round(best * 100)}% match</span>}
              <ChevronDown className={`size-3.5 transition ${showSources ? "rotate-180" : ""}`} />
            </button>
          )}
          {meta.query_id && (
            <span className="ml-auto inline-flex items-center gap-1">
              <span className="mr-0.5">
                {message.feedback === "up" ? "Marked helpful" : message.feedback === "down" ? "Marked not helpful" : "Helpful?"}
              </span>
              {(["up", "down"] as const).map((v) => {
                const Icon = v === "up" ? ThumbsUp : ThumbsDown;
                const chosen = message.feedback === v;
                return (
                  <button
                    key={v}
                    onClick={() => onFeedback(message.id, v)}
                    disabled={!!message.feedback}
                    aria-label={v === "up" ? "Helpful" : "Not helpful"}
                    title={v === "up" ? "Helpful" : "Not helpful"}
                    aria-pressed={chosen}
                    className={`rounded-md border p-1.5 transition disabled:cursor-default ${
                      chosen
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-border hover:border-accent/40 hover:text-fg disabled:hover:border-border"
                    } ${message.feedback && !chosen ? "opacity-30" : ""}`}
                  >
                    <Icon className="size-4" fill={chosen ? "currentColor" : "none"} />
                  </button>
                );
              })}
            </span>
          )}
        </div>
      )}

      {showSources && chunks.length > 0 && (
        <ol className="mt-2 space-y-2">
          {meta!.chunks.map((c, i) =>
            c.text ? <SourceItem key={i} chunk={c} n={i + 1} anchor={`cite-${message.id}-${i + 1}`} /> : null,
          )}
        </ol>
      )}

      {steps.length > 0 && (
        <details className="mt-1 text-xs text-muted">
          <summary className="w-fit cursor-pointer rounded-md px-2 py-1 select-none hover:bg-surface-2 hover:text-fg">How I answered</summary>
          <p className="mt-1 px-2 font-mono">{steps.join(" → ")}</p>
        </details>
      )}
    </div>
  );
}
