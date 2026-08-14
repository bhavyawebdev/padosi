"use client";

import { useEffect, useState, useCallback } from "react";
import { ScrollText } from "lucide-react";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (pageNum: number) => {
    try {
      const res = await fetch(`/api/admin/audit?page=${pageNum}`);
      const body = (await res.json()) as { entries?: AuditEntry[]; total?: number; error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "Failed to load the audit log");
      }
      setEntries(body.entries ?? []);
      setTotal(body.total ?? 0);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load the audit log");
    } finally {
      setLoading(false);
    }
  }, []);

  // Deferred through a microtask so setState never runs synchronously.
  useEffect(() => {
    void Promise.resolve().then(() => load(page));
  }, [load, page]);

  const perPage = 25;
  const pages = Math.max(Math.ceil(total / perPage), 1);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="headline-lg text-on-surface font-extrabold tracking-tight">Audit log</h1>
        <p className="body-md text-on-surface-variant">
          Immutable record of administrative actions. {total.toLocaleString("en-IN")} entries.
        </p>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">{error}</div>
      )}

      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <ScrollText size={32} className="mx-auto mb-2 text-on-surface-variant" />
            <p className="body-md text-on-surface-variant">No audit entries yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/20">
            {entries.map((e) => (
              <li key={e.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <p className="label-md text-on-surface font-semibold">{e.action}</p>
                  <p className="label-sm text-on-surface-variant truncate">
                    {e.actor_role ?? "system"}
                    {e.target_type ? ` · ${e.target_type}${e.target_id ? ` ${e.target_id.slice(0, 8)}…` : ""}` : ""}
                    {e.reason ? ` · ${e.reason}` : ""}
                  </p>
                </div>
                <time className="label-sm text-on-surface-variant shrink-0">
                  {new Date(e.created_at).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => {
              setLoading(true);
              setPage((p) => Math.max(p - 1, 1));
            }}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl label-md border border-outline-variant text-on-surface disabled:opacity-40"
          >
            Previous
          </button>
          <span className="label-md text-on-surface-variant">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => {
              setLoading(true);
              setPage((p) => Math.min(p + 1, pages));
            }}
            disabled={page >= pages}
            className="px-4 py-2 rounded-xl label-md border border-outline-variant text-on-surface disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
