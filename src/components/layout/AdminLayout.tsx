import { Navigate, Outlet, useNavigate } from "react-router-dom";

import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar, type AdminNavSection } from "./AdminSidebar";

const ADMIN_SECTIONS: AdminNavSection[] = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "monitoring", end: true },
  { to: "/admin/users", label: "Users", icon: "group", end: false },
  { to: "/admin/posts", label: "Posts", icon: "campaign", end: false },
  { to: "/admin/requests", label: "Requests", icon: "handshake", end: false },
  { to: "/admin/providers", label: "Providers", icon: "verified_user", end: false },
  { to: "/admin/reports", label: "Reports", icon: "flag", end: false },
];

/**
 * Dedicated admin console — a separate experience from the customer app.
 * No customer header/bottom-nav; instead a full-height sidebar (desktop) or
 * a top bar with scrollable section pills (mobile).
 *
 * Gate (in order): signed out → admin login; signed in but not admin →
 * denied (community accounts are redirected to their own customer-side
 * dashboard — the admin portal is platform-admin only). Authorization is
 * enforced by the database via security-definer RPCs + RLS; this UI check
 * is only about routing.
 */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdmin = user?.role === "admin";

  if (!user) {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === "community") {
    return <Navigate to="/community" replace />;
  }

  if (!isAdmin) {
    return <AdminAccessDenied />;
  }

  const sections: AdminNavSection[] = ADMIN_SECTIONS;

  const signOut = () => {
    logout();
    navigate("/admin", { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface-dim/30 lg:flex">
      <AdminSidebar sections={sections} onSignOut={signOut} />

      <div className="flex-1 min-w-0 lg:pl-64">
        <AdminHeader sections={sections} onSignOut={signOut} />

        <main className="max-w-[1120px] mx-auto px-margin-mobile md:px-8 py-6 md:py-8 pb-28 lg:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
