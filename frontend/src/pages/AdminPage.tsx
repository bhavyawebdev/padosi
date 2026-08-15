import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminUsersPanel } from "@/components/admin/AdminUsersPanel";
import {
  AdminPostsPanel,
  ProvidersPanel,
  ReportsPanel,
  RequestsPanel,
} from "@/components/admin/AdminModerationPanels";
import { CommunityPanel } from "@/components/admin/CommunityPanel";
import { useAuth } from "@/hooks/useAuth";

export type AdminSection = "overview" | "users" | "posts" | "requests" | "providers" | "reports";

const SECTION_TITLES: Record<AdminSection, { title: string; blurb: string }> = {
  overview: {
    title: "Overview",
    blurb: "Platform-wide numbers, people, and content — moderated in one place.",
  },
  users: { title: "Users", blurb: "Roles, verification status, and accounts across the platform." },
  posts: { title: "Posts", blurb: "Everything neighbours have shared on the Nearby feed." },
  requests: { title: "Requests", blurb: "Open and closed requests from the Need It Now board." },
  providers: { title: "Providers", blurb: "Verified Help profiles and their trust scores." },
  reports: { title: "Reports", blurb: "The abuse queue — review and dismiss." },
};

/**
 * Renders one admin section. Rendered inside <AdminLayout> (which owns the
 * gate + sidebar); the section is driven by the URL, not local state.
 */
export function AdminPage({ section }: { section: AdminSection }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  if (isAdmin) {
    const meta = SECTION_TITLES[section];
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-lg font-headline-lg text-on-background">{meta.title}</h1>
          <p className="text-body-md font-body-md text-on-surface-variant mt-1">{meta.blurb}</p>
        </header>

        {section === "overview" && <AdminOverview />}
        {section === "users" && <AdminUsersPanel />}
        {section === "posts" && <AdminPostsPanel />}
        {section === "requests" && <RequestsPanel />}
        {section === "providers" && <ProvidersPanel />}
        {section === "reports" && <ReportsPanel />}
      </div>
    );
  }

  return <CommunityPanel />;
}
