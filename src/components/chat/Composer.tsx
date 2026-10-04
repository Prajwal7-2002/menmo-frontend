"use client";

import { useEffect, useRef } from "react";
import { Files, SendHorizontal, Sparkles } from "lucide-react";
import type { DocumentsByDomain } from "@/lib/api";
import { Spinner } from "@/components/ui";

export const TONES = ["auto", "friendly", "formal", "concise", "empathetic", "playful"] as const;
export type Tone = (typeof TONES)[number];

/** "all" | "domain:<name>" | "doc:<id>" */
export type Scope = string;

export function scopeToBody(scope: Scope): { domain?: string; document_id?: string } {
  if (scope.startsWith("doc:")) return { document_id: scope.slice(4) };
  if (scope.startsWith("domain:")) return { domain: scope.slice(7) };
  return {};
}

const selectClass =
  "max-w-[11rem] truncate rounded-md border border-transparent bg-transparent py-1 pr-6 pl-1.5 text-xs text-muted outline-none hover:border-border hover:text-fg focus:border-accent";

export function Composer({
  value,
  onChange,
  onSend,
  busy,
  documents,
  scope,
  onScope,
  tone,
  onTone,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
  documents: DocumentsByDomain;
  scope: Scope;
  onScope: (s: Scope) => void;
  tone: Tone;
  onTone: (t: Tone) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Grow with content up to ~8 lines
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const domains = Object.keys(documents);
  const canSend = value.trim().length > 0 && !busy;
  const pretty = (d: string) => d.replace(/_/g, " ");

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15">
      <textarea
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
        placeholder="Ask about your documents, or anything else…"
        className="block w-full resize-none bg-transparent px-4 pt-3 pb-1 text-fg outline-none placeholder:text-muted"
        aria-label="Message"
      />
      <div className="flex items-center gap-1 px-2 pb-2">
        <label className="inline-flex items-center gap-1 text-muted" title="Which documents to search">
          <Files className="size-3.5" />
          <select value={scope} onChange={(e) => onScope(e.target.value)} className={selectClass} aria-label="Search scope">
            <option value="all">All my documents</option>
            {domains.length > 0 && (
              <optgroup label="Topic">
                {domains.map((d) => (
                  <option key={d} value={`domain:${d}`}>
                    {pretty(d)}
                  </option>
                ))}
              </optgroup>
            )}
            {domains.map((d) => (
              <optgroup key={d} label={`Document · ${pretty(d)}`}>
                {documents[d].map((doc) => (
                  <option key={doc.id} value={`doc:${doc.id}`}>
                    {doc.title || doc.filename}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-1 text-muted" title="Reply tone (Auto lets Menmo choose)">
          <Sparkles className="size-3.5" />
          <select value={tone} onChange={(e) => onTone(e.target.value as Tone)} className={selectClass} aria-label="Tone">
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t === "auto" ? "Auto tone" : t[0].toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </label>
        <button
          onClick={onSend}
          disabled={!canSend}
          className="ml-auto grid size-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white transition disabled:opacity-40"
          aria-label="Send"
        >
          {busy ? <Spinner /> : <SendHorizontal className="size-4" />}
        </button>
      </div>
    </div>
  );
}
