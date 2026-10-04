"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, FileText, Trash2, Upload } from "lucide-react";
import { api, uploadWithProgress, type DocumentsByDomain } from "@/lib/api";
import { useToast } from "@/components/toast";
import { Spinner } from "@/components/ui";

const ACCEPT = [".pdf", ".docx", ".txt", ".md"];
const MAX_MB = 20;

interface UploadItem {
  key: string;
  name: string;
  phase: "uploading" | "indexing" | "done" | "error";
  progress: number;
  message?: string;
}

export default function DocumentsPage() {
  const toast = useToast();
  const [docs, setDocs] = useState<DocumentsByDomain>({});
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      setDocs(await api.documents());
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    api
      .documents()
      .then(setDocs)
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  const update = (key: string, patch: Partial<UploadItem>) =>
    setUploads((u) => u.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    const items = list.map((f, i) => ({
      key: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      phase: "uploading" as const,
      progress: 0,
    }));
    setUploads((u) => [...items, ...u]);

    // One at a time: indexing is CPU-heavy on the server.
    for (const [i, file] of list.entries()) {
      const { key } = items[i];
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPT.includes(ext)) {
        update(key, { phase: "error", message: `Unsupported type. Use ${ACCEPT.join(", ")}` });
        continue;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        update(key, { phase: "error", message: `Larger than ${MAX_MB} MB` });
        continue;
      }
      try {
        const res = await uploadWithProgress(file, (p) =>
          update(key, p >= 1 ? { phase: "indexing", progress: 1 } : { progress: p }),
        );
        update(key, {
          phase: "done",
          message: `${res.chunks_indexed} passages · topic: ${res.domain.replace(/_/g, " ")}`,
        });
        refresh();
      } catch (e) {
        update(key, { phase: "error", message: (e as Error).message });
      }
    }
  }

  async function remove(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? Mnemo will forget its contents.`)) return;
    try {
      await api.deleteDocument(id);
      toast("Document deleted");
      refresh();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  const domains = Object.keys(docs);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
      <p className="mt-1 text-sm text-muted">Upload files for Mnemo to read. Only you can search your documents.</p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={`mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/50"
        }`}
      >
        <Upload className="size-6 text-accent" />
        <p className="mt-3 font-medium">Drop files here or click to choose</p>
        <p className="mt-1 text-xs text-muted">
          PDF, Word, text or Markdown · up to {MAX_MB} MB · scanned PDFs are read with OCR
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploads.length > 0 && (
        <ul className="mt-4 space-y-2">
          {uploads.map((u) => (
            <li key={u.key} className="rounded-xl border border-border bg-surface px-4 py-3 text-sm">
              <div className="flex items-center gap-2">
                {u.phase === "done" ? (
                  <Check className="size-4 text-ok" />
                ) : u.phase === "error" ? (
                  <CircleAlert className="size-4 text-danger" />
                ) : (
                  <Spinner className="size-4 text-accent" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {u.phase === "uploading" && `Uploading ${Math.round(u.progress * 100)}%`}
                  {u.phase === "indexing" && "Reading & indexing…"}
                </span>
              </div>
              {u.phase === "uploading" && (
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-accent transition-all" style={{ width: `${u.progress * 100}%` }} />
                </div>
              )}
              {u.phase === "indexing" && (
                <p className="mt-1 text-xs text-muted">Large or scanned PDFs can take a minute or two.</p>
              )}
              {u.message && (
                <p className={`mt-1 text-xs ${u.phase === "error" ? "text-danger" : "text-muted"}`}>{u.message}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10">
        {loading ? (
          <div className="grid place-items-center py-10 text-muted">
            <Spinner className="size-5" />
          </div>
        ) : domains.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">No documents yet.</p>
        ) : (
          domains.map((d) => (
            <section key={d} className="mb-8">
              <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">{d.replace(/_/g, " ")}</h2>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {docs[d].map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 shrink-0 text-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{doc.title || doc.filename}</p>
                      <p className="truncate text-xs text-muted">
                        {doc.filename} · added {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(doc.id, doc.title || doc.filename)}
                      className="rounded-md p-2 text-muted transition hover:bg-danger/10 hover:text-danger"
                      aria-label={`Delete ${doc.title || doc.filename}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
