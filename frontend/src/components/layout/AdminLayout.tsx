import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

const ADMIN_SECTIONS = [
  { to: "/admin", label: "Overview", icon: "monitoring", end: true },
  { to: "/admin/users", label: "Users", icon: "group", end: false },
  { to: "/admin/posts", label: "Posts", icon: "campaign", end: false },
  { to: "/admin/requests", label: "Requests", icon: "handshake", end: false },
  { to: "/admin/providers", label: "Providers", icon: "verified_user", end: false },
  { to: "/admin/reports", label: "Reports", icon: "flag", end: false },
];

/**
 * Dedicated admin console — a separate experience from the customer app.
 * No customer header/bottom-nav; instead a full-height sidebar (desktop) or
 * a top bar with scrollable section pills (mobile), and its own colour
 * treatment. Only `admin` and `community` roles may enter.
 */
export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === "admin";
  const isCommunity = user?.role === "community";

  if (!isAdmin && !isCommunity) {
    return <AdminAccessDenied />;
  }

  const sections = isCommunity
    ? [{ to: "/admin", label: "Society dashboard", icon: "apartment", end: true }]
    : ADMIN_SECTIONS;

  // Community accounts only have the society dashboard.
  if (isCommunity && location.pathname !== "/admin") {
    return <Navigate to="/admin" replace />;
  }

  const signOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface-dim/30 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-primary text-on-primary z-40">
        <div className="flex items-center gap-3 px-6 py-6 border-b border-on-primary/10">
          <Logo dark />
          <span className="text-label-md font-label-md font-bold">Admin console</span>
        </div>

        <nav aria-label="Admin sections" className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-label-md font-label-md transition-colors",
                  isActive
                    ? "bg-on-primary/15 font-bold shadow-inner"
                    : "text-on-primary/80 hover:bg-on-primary/10 hover:text-on-primary",
                )
              }
            >
              <span aria-hidden className="material-symbols-outlined text-[20px]">
                {s.icon}
              </span>
              {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-on-primary/10 space-y-1">
          <Link
            to="/nearby"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-label-md font-label-md text-on-primary/80 hover:bg-on-primary/10 hover:text-on-primary transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-[20px]">
              arrow_back
            </span>
            Back to the site
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-label-md font-label-md text-on-primary/80 hover:bg-on-primary/10 hover:text-on-primary transition-colors"
          >
            <span aria-hidden className="material-symbols-outlined text-[20px]">
              logout
            </span>
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden safe-top sticky top-0 z-40 bg-primary text-on-primary">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Logo dark />
            <span className="text-label-md font-label-md font-bold">Admin console</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/nearby"
              aria-label="Back to the site"
              className="p-2 rounded-full hover:bg-on-primary/10 transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined">
                arrow_back
              </span>
            </Link>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="p-2 rounded-full hover:bg-on-primary/10 transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined">
                logout
              </span>
            </button>
          </div>
        </div>
        <nav aria-label="Admin sections" className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-label-sm font-label-sm whitespace-nowrap transition-colors",
                  isActive ? "bg-on-primary/20 font-bold" : "text-on-primary/80 hover:bg-on-primary/10",
                )
              }
            >
              <span aria-hidden className="material-symbols-outlined text-[16px]">
                {s.icon}
              </span>
              {s.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* Content */}
      <div className="flex-1 min-w-0 lg:pl-64">
        <div className="lg:sticky lg:top-0 z-30 hidden lg:flex items-center justify-between px-8 py-4 bg-surface/80 backdrop-blur border-b border-outline-variant">
          <p className="text-label-sm font-label-sm text-on-surface-variant">
            {isAdmin ? "Platform super-admin" : "Community account"} · {user?.locality?.name ?? "No locality"}
          </p>
          <div className="flex items-center gap-2.5">
            <span className="text-label-md font-label-md text-on-background hidden sm:block">
              {user?.full_name}
            </span>
            <Avatar name={user?.full_name ?? "?"} size="sm" className="border border-outline-variant" />
          </div>
        </div>
        <main className="max-w-[1120px] mx-auto px-margin-mobile md:px-8 py-6 md:py-8 pb-28 lg:pb-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
