"use client";

import { useEffect, useState } from "react";
import { api, type Analytics } from "@/lib/api";
import { ErrorBox, Spinner } from "@/components/ui";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.analytics().then(setData).catch((e) => setError((e as Error).message));
  }, []);

  const rated = data ? data.positive_feedback + data.negative_feedback : 0;
  const maxCount = Math.max(1, ...(data?.top_queries.map((q) => q.count) ?? [1]));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
      <p className="mt-1 text-sm text-muted">How you&apos;ve been using Menmo.</p>

      {error && (
        <div className="mt-6">
          <ErrorBox>{error}</ErrorBox>
        </div>
      )}
      {!data && !error && (
        <div className="grid place-items-center py-16 text-muted">
          <Spinner className="size-5" />
        </div>
      )}

      {data && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Questions asked" value={data.total_queries} />
            <Stat label="Today" value={data.queries_today} />
            <Stat
              label="Helpful answers"
              value={rated ? `${Math.round((data.positive_feedback / rated) * 100)}%` : "–"}
              hint={rated ? `${rated} rated` : "No ratings yet"}
            />
            <Stat label="Avg. match" value={`${Math.round(data.avg_score * 100)}%`} hint="Relevance of sources" />
          </div>

          <h2 className="mt-10 mb-3 text-sm font-semibold">Most asked</h2>
          {data.top_queries.length === 0 ? (
            <p className="text-sm text-muted">Nothing yet — ask Menmo something.</p>
          ) : (
            <ul className="space-y-2">
              {data.top_queries.map((q) => (
                <li key={q.query} className="rounded-lg border border-border bg-surface px-3 py-2">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{q.query}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">×{q.count}</span>
                  </div>
                  <div className="mt-1.5 h-1 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(q.count / maxCount) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
