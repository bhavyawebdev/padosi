import { useState } from "react";

import { Avatar } from "@/components/common/Avatar";
import { Chip } from "@/components/common/Chip";
import { EmptyState, ErrorState, LoadingState } from "@/components/common/Feedback";
import { SearchInput } from "@/components/common/Form";
import { timeAgo } from "@/lib/geo";
import { useAdminUsers, useUpdateAdminUser } from "@/features/admin/adminHooks";
import type { UserRole } from "@/types";

const ROLE_FILTERS: Array<{ value: UserRole | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "community", label: "Community" },
  { value: "admin", label: "Admin" },
];

const ROLE_TONES: Record<UserRole, string> = {
  individual: "bg-surface-container-low text-on-surface-variant border border-outline-variant",
  business: "bg-secondary-fixed/50 text-on-secondary-container border border-secondary-fixed-dim",
  community: "bg-primary/10 text-primary border border-primary/20",
  admin: "bg-error-container/50 text-on-error-container border border-error-container",
};

function RoleSelect({ value, onChange, disabled }: { value: UserRole; onChange: (r: UserRole) => void; disabled?: boolean }) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as UserRole)}
      className="bg-surface rounded-lg border border-outline-variant px-2 py-1.5 text-label-sm font-label-sm text-on-surface focus:outline-none focus:border-primary disabled:opacity-50"
      aria-label="Change role"
    >
      <option value="individual">Individual</option>
      <option value="business">Business</option>
      <option value="community">Community</option>
      <option value="admin">Admin</option>
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-primary" : "bg-surface-variant"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white border-2 transition-transform ${
          checked ? "translate-x-4 border-primary" : "translate-x-0.5 border-surface-variant"
        }`}
      />
    </button>
  );
}

export function AdminUsersPanel() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const { data, isLoading, isError, refetch } = useAdminUsers(q, roleFilter === "all" ? undefined : roleFilter);
  const updateUser = useUpdateAdminUser();

  const filtered = data ?? [];

  if (isLoading) return <LoadingState label="Loading users…" />;
  if (isError) return <ErrorState message="Could not load users." onRetry={() => void refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <SearchInput
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search users"
          className="md:max-w-xs"
        />
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_FILTERS.map((f) => (
            <Chip
              key={f.value}
              label={f.label}
              active={roleFilter === f.value}
              onClick={() => setRoleFilter(f.value)}
            />
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="group_off" title="No users found" message="Try a different search or role filter." />
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="border-b border-outline-variant/60">
                <th className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Locality</th>
                <th className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Role</th>
                <th className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Phone</th>
                <th className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Govt&nbsp;ID</th>
                <th className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-surface-container-low/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.full_name} size="sm" />
                      <div className="min-w-0">
                        <p className="text-label-md font-label-md text-on-background truncate">{u.full_name}</p>
                        <p className="text-label-sm font-label-sm text-on-surface-variant truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant">
                    {u.locality_name ?? "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-label-sm font-label-sm ${ROLE_TONES[u.role]}`}>
                        {u.role}
                      </span>
                      <RoleSelect
                        value={u.role}
                        disabled={updateUser.isPending}
                        onChange={(role) => updateUser.mutate({ id: u.id, payload: { role } })}
                      />
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Toggle
                      checked={u.phone_verified}
                      label={`Toggle phone verification for ${u.full_name}`}
                      onChange={(phone_verified) => updateUser.mutate({ id: u.id, payload: { phone_verified } })}
                    />
                  </td>
                  <td className="px-5 py-3">
                    <Toggle
                      checked={u.govt_id_verified}
                      label={`Toggle govt ID verification for ${u.full_name}`}
                      onChange={(govt_id_verified) => updateUser.mutate({ id: u.id, payload: { govt_id_verified } })}
                    />
                  </td>
                  <td className="px-5 py-3 text-label-sm font-label-sm text-on-surface-variant whitespace-nowrap">
                    {timeAgo(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
