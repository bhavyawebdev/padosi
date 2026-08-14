"use client";

import { useEffect, useState, useCallback } from "react";
import { Flag, Check, X, Trash2, RotateCcw, Ban, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Report {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "user" | "message" | "group";
  target_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/reports?status=${status}`);
      const body = (await res.json()) as { reports?: Report[]; error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "Failed to load reports");
      }
      setReports(body.reports ?? []);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [status]);

  // Deferred through a microtask so setState never runs synchronously.
  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const act = async (reportId: string, action: string) => {
    setBusyId(reportId);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "Action failed");
      }
      setNotice("Action recorded.");
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const typeLabel: Record<Report["target_type"], string> = {
    post: "Post",
    comment: "Comment",
    user: "User",
    message: "Message",
    group: "Group",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="headline-lg text-on-surface font-extrabold tracking-tight">Moderation</h1>
          <p className="body-md text-on-surface-variant">Review reported content and users.</p>
        </div>
        <div className="flex gap-1 rounded-2xl bg-surface-container p-1">
          {["open", "resolved", "dismissed", "all"].map((s) => (
            <button
              key={s}
              onClick={() => {
                setLoading(true);
                setStatus(s);
              }}
              className={`px-4 py-2 rounded-xl label-md capitalize transition-colors ${
                status === s
                  ? "bg-surface-container-lowest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">{error}</div>
      )}
      {notice && (
        <div className="p-4 rounded-2xl bg-primary-container/60 text-on-primary-container label-md">{notice}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-surface-container animate-pulse" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
          <Flag size={32} className="mx-auto mb-2 text-on-surface-variant" />
          <p className="body-md text-on-surface-variant">No {status !== "all" ? status : ""} reports.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {reports.map((r) => (
            <li
              key={r.id}
              className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full label-sm bg-secondary-container text-secondary">
                      {typeLabel[r.target_type]}
                    </span>
                    <span className="px-2.5 py-1 rounded-full label-sm bg-surface-container-high text-on-surface capitalize">
                      {r.status}
                    </span>
                    <span className="label-sm text-on-surface-variant">
                      {new Date(r.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="label-md text-on-surface font-semibold mt-2">{r.reason}</p>
                  {r.description && (
                    <p className="label-sm text-on-surface-variant mt-1">{r.description}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1 border-t border-outline-variant/20">
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "dismiss")}>
                  <X size={14} /> Dismiss
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "warn_user")}>
                  <Bell size={14} /> Warn user
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "remove_content")}>
                  <Trash2 size={14} /> Remove content
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "restore_content")}>
                  <RotateCcw size={14} /> Restore
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "suspend_user")}>
                  <Ban size={14} /> Suspend author
                </Button>
                <Button variant="destructive" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "disable_user")}>
                  <Ban size={14} /> Disable author
                </Button>
                <Button variant="outline" size="sm" disabled={busyId === r.id} onClick={() => act(r.id, "resolve")}>
                  <Check size={14} /> Resolve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
