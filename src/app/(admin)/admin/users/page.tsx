"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Ban, RotateCcw, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AdminUser {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  neighbourhood: string | null;
  role: "user" | "moderator" | "admin" | "super_admin";
  status: "active" | "suspended" | "disabled";
  email_verified: boolean;
  created_at: string;
  last_seen_at: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
}

const ROLE_OPTIONS = ["user", "moderator", "admin", "super_admin"] as const;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const body = (await res.json()) as UsersResponse & { error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "Failed to load users");
      }
      setUsers(body.users);
      setTotal(body.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const act = async (
    id: string,
    action: "suspend" | "unsuspend" | "disable" | "restore" | "change_role",
    role?: (typeof ROLE_OPTIONS)[number]
  ) => {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role ? { action, role } : { action }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok || body.error) {
        throw new Error(body.error ?? "Action failed");
      }
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const statusPill = (status: AdminUser["status"]) => {
    const styles: Record<AdminUser["status"], string> = {
      active: "bg-tertiary-container text-tertiary",
      suspended: "bg-secondary-container text-secondary",
      disabled: "bg-error-container text-error",
    };
    return (
      <span className={`px-2.5 py-1 rounded-full label-sm capitalize ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="headline-lg text-on-surface font-extrabold tracking-tight">Users</h1>
        <p className="body-md text-on-surface-variant">
          {total.toLocaleString("en-IN")} accounts · search, filter and manage access.
        </p>
      </header>

      {error && (
        <div className="p-4 rounded-2xl bg-error-container text-on-error-container label-md">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search name, email or username…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface body-md outline-none focus:border-primary"
        >
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-12 px-4 rounded-2xl border border-outline-variant bg-surface-container-lowest text-on-surface body-md outline-none focus:border-primary"
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-lowest overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 rounded-2xl bg-surface-container animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <UserRound size={32} className="mx-auto mb-2 text-on-surface-variant" />
            <p className="body-md text-on-surface-variant">No users match your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-outline-variant/20">
            {users.map((u) => (
              <li key={u.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.avatar_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary-container text-primary flex items-center justify-center">
                      <UserRound size={18} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="label-md text-on-surface font-semibold truncate">
                      {u.full_name || "Unnamed user"}
                    </p>
                    <p className="label-sm text-on-surface-variant truncate">
                      {u.email ?? "no email"} {!u.email_verified && "· unverified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {statusPill(u.status)}
                  <span className="px-2.5 py-1 rounded-full label-sm bg-surface-container-high text-on-surface capitalize">
                    {u.role}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) =>
                      act(u.id, "change_role", e.target.value as (typeof ROLE_OPTIONS)[number])
                    }
                    className="h-10 px-3 rounded-xl border border-outline-variant bg-surface-container-lowest text-on-surface label-md outline-none focus:border-primary"
                    aria-label={`Role for ${u.full_name ?? u.id}`}
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {u.status === "active" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => act(u.id, "suspend")}
                    >
                      <Ban size={14} />
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => act(u.id, u.status === "suspended" ? "unsuspend" : "restore")}
                    >
                      <RotateCcw size={14} />
                      Restore
                    </Button>
                  )}

                  {u.status !== "disabled" && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busyId === u.id}
                      onClick={() => act(u.id, "disable")}
                    >
                      Disable
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="label-sm text-on-surface-variant flex items-center gap-1.5">
        <ShieldCheck size={14} />
        Every action here is recorded in the immutable audit log.
      </p>
    </div>
  );
}
