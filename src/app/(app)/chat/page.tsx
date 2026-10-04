"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { api, type Conversation, type DocumentsByDomain } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";
import { AssistantMessage, UserMessage, type ChatMessage } from "@/components/chat/Message";
import { Composer, scopeToBody, TONES, type Scope, type Tone } from "@/components/chat/Composer";
import { ConversationList } from "@/components/chat/ConversationList";

const ACTIVE_KEY = "mnemo.activeConversation";
const TONE_KEY = "mnemo.tone";

function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string | null) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {}
}

const SUGGESTIONS = [
  "Summarize my most recent document",
  "What can you help me with?",
  "Remember that I prefer short answers",
  "What is retrieval-augmented generation?",
];

let seq = 0;
const newId = () => `m${Date.now()}-${seq++}`;

export default function ChatPage() {
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(() => stored(ACTIVE_KEY));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(() => !!stored(ACTIVE_KEY));
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [documents, setDocuments] = useState<DocumentsByDomain>({});
  const [scope, setScope] = useState<Scope>("all");
  const [tone, setTone] = useState<Tone>(() => {
    const t = stored(TONE_KEY);
    return (TONES as readonly string[]).includes(t ?? "") ? (t as Tone) : "auto";
  });
  const [listOpen, setListOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  // A chat created by sending its first message already has its messages on screen.
  const justCreated = useRef<string | null>(null);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await api.listConversations());
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  // Initial data
  useEffect(() => {
    refreshConversations();
    api.documents().then(setDocuments).catch(() => {});
  }, [refreshConversations]);

  // Load messages when switching chats
  useEffect(() => {
    if (!activeId || justCreated.current === activeId) return;
    let cancelled = false;
    api
      .history(activeId)
      .then((h) => {
        if (!cancelled) setMessages(h.map((m) => ({ id: newId(), role: m.role, content: m.content })));
      })
      .catch((e) => {
        if (cancelled) return;
        if ((e as { status?: number }).status === 404) {
          // Chat was deleted elsewhere
          setActiveId(null);
          store(ACTIVE_KEY, null);
        } else toast((e as Error).message, "error");
      })
      .finally(() => !cancelled && setLoadingHistory(false));
    return () => {
      cancelled = true;
    };
  }, [activeId, toast]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function selectConversation(id: string | null) {
    setListOpen(false);
    if (id === activeId) return;
    setMessages([]);
    setLoadingHistory(!!id);
    setActiveId(id);
    store(ACTIVE_KEY, id);
  }

  async function send(textArg?: string) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((m) => [...m.filter((x) => !x.error), { id: newId(), role: "user", content: text }]);

    try {
      let id = activeId;
      if (!id) {
        id = (await api.createConversation()).id;
        justCreated.current = id;
        setActiveId(id);
        store(ACTIVE_KEY, id);
      }
      const res = await api.chat(id, { query: text, mood: tone, ...scopeToBody(scope) });
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: res.answer, meta: res }]);
      refreshConversations(); // title + ordering
    } catch (e) {
      setMessages((m) => [
        ...m,
        { id: newId(), role: "assistant", content: (e as Error).message, error: true, retryText: text },
      ]);
    } finally {
      setSending(false);
    }
  }

  function retry(text: string) {
    // drop the failed user turn + error, then resend
    setMessages((m) => {
      const i = m.findLastIndex((x) => x.role === "user" && x.content === text);
      return i >= 0 ? m.slice(0, i) : m;
    });
    send(text);
  }

  async function feedback(messageId: string, value: "up" | "down") {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.meta?.query_id) return;
    setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, feedback: value } : x)));
    try {
      await api.feedback(msg.meta.query_id, value);
      toast("Thanks for the feedback");
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === messageId ? { ...x, feedback: undefined } : x)));
      toast((e as Error).message, "error");
    }
  }

  async function rename(id: string, title: string) {
    setConversations((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
    try {
      await api.renameConversation(id, title);
    } catch (e) {
      toast((e as Error).message, "error");
      refreshConversations();
    }
  }

  async function remove(id: string) {
    try {
      await api.deleteConversation(id);
      setConversations((cs) => cs.filter((c) => c.id !== id));
      if (id === activeId) selectConversation(null);
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const hasDocs = Object.keys(documents).length > 0;
  const list = (
    <ConversationList
      conversations={conversations}
      activeId={activeId}
      loading={loadingList}
      onNew={() => selectConversation(null)}
      onSelect={selectConversation}
      onRename={rename}
      onDelete={remove}
    />
  );

  return (
    <div className="flex h-full">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface/60 lg:block">{list}</aside>

      {listOpen && (
        <div className="fixed inset-0 z-30 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setListOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-72 bg-surface shadow-xl">
            <button onClick={() => setListOpen(false)} className="absolute top-3.5 right-3 z-10 rounded-md p-1 text-muted hover:bg-surface-2" aria-label="Close chats">
              <X className="size-4" />
            </button>
            <div className="h-full pt-8">{list}</div>
          </aside>
        </div>
      )}

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h1 className="truncate text-sm font-medium">
            {conversations.find((c) => c.id === activeId)?.title ?? "New chat"}
          </h1>
          <button
            onClick={() => setListOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted hover:bg-surface-2 hover:text-fg lg:hidden"
          >
            <MessageCircle className="size-4" /> Chats
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {loadingHistory ? (
              <div className="grid place-items-center py-20 text-muted">
                <Spinner className="size-5" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center">
                <h2 className="text-2xl font-semibold tracking-tight">What would you like to know?</h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                  Menmo answers from your documents first, then the web, and remembers what you tell it.
                  {!hasDocs && (
                    <>
                      {" "}
                      <Link href="/documents" className="font-medium text-accent hover:underline">
                        Upload a document
                      </Link>{" "}
                      to get started.
                    </>
                  )}
                </p>
                <div className="mx-auto mt-8 grid max-w-xl gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm transition hover:border-accent/50 hover:bg-accent-soft"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <UserMessage key={m.id} message={m} />
                ) : (
                  <AssistantMessage key={m.id} message={m} onFeedback={feedback} onRetry={retry} />
                ),
              )
            )}
            {sending && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Spinner /> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="border-t border-border bg-bg/80 px-4 pt-3 pb-4 backdrop-blur">
          <div className="mx-auto max-w-3xl">
            <Composer
              value={input}
              onChange={setInput}
              onSend={() => send()}
              busy={sending}
              documents={documents}
              scope={scope}
              onScope={setScope}
              tone={tone}
              onTone={(t) => {
                setTone(t);
                store(TONE_KEY, t);
              }}
            />
            <p className="mt-2 text-center text-[11px] text-muted">Menmo can make mistakes. Check important facts against the sources.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
