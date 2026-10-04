"use client";

import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import type { Conversation } from "@/lib/api";

export function ConversationList({
  conversations,
  activeId,
  loading,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: {
  conversations: Conversation[];
  activeId: string | null;
  loading: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const commit = (id: string) => {
    const t = draft.trim();
    if (t) onRename(id, t);
    setEditing(null);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <button
          onClick={onNew}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition hover:bg-surface-2"
        >
          <Plus className="size-4" /> New chat
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {loading && conversations.length === 0 && <p className="px-2 py-1 text-xs text-muted">Loading…</p>}
        {!loading && conversations.length === 0 && <p className="px-2 py-1 text-xs text-muted">No chats yet.</p>}
        {conversations.map((c) => {
          const active = c.id === activeId;
          if (editing === c.id) {
            return (
              <div key={c.id} className="flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-1">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(c.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  aria-label="Chat title"
                />
                <button onClick={() => commit(c.id)} className="rounded p-1 text-muted hover:text-fg" aria-label="Save">
                  <Check className="size-3.5" />
                </button>
                <button onClick={() => setEditing(null)} className="rounded p-1 text-muted hover:text-fg" aria-label="Cancel">
                  <X className="size-3.5" />
                </button>
              </div>
            );
          }
          return (
            <div
              key={c.id}
              className={`group flex items-center rounded-lg text-sm transition ${
                active ? "bg-accent-soft text-accent" : "text-fg hover:bg-surface-2"
              }`}
            >
              <button onClick={() => onSelect(c.id)} className="min-w-0 flex-1 truncate px-3 py-2 text-left">
                {c.title || "New Chat"}
              </button>
              <div className={`flex shrink-0 pr-1 ${active ? "" : "opacity-0 focus-within:opacity-100 group-hover:opacity-100"}`}>
                <button
                  onClick={() => {
                    setDraft(c.title);
                    setEditing(c.id);
                  }}
                  className="rounded p-1 text-muted hover:text-fg"
                  aria-label="Rename chat"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  onClick={() => window.confirm(`Delete "${c.title}"?`) && onDelete(c.id)}
                  className="rounded p-1 text-muted hover:text-danger"
                  aria-label="Delete chat"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
