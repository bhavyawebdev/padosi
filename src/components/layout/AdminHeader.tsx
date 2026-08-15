import { Link, NavLink } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { Logo } from "./Logo";
import type { AdminNavSection } from "./AdminSidebar";

/**
 * Admin header — two bars for two viewports:
 *  - Mobile (< lg): primary top bar with logo, the section pills, a link
 *    back to the customer site and sign out.
 *  - Desktop (>= lg): sticky identity strip inside the content column
 *    (role · locality on the left, current admin name + avatar on the right).
 */
export function AdminHeader({
  sections,
  onSignOut,
}: {
  sections: AdminNavSection[];
  onSignOut: () => void;
}) {
  const { user } = useAuth();

  return (
    <>
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
              onClick={onSignOut}
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

      {/* Desktop identity strip */}
      <div className="lg:sticky lg:top-0 z-30 hidden lg:flex items-center justify-between px-8 py-4 bg-surface/80 backdrop-blur border-b border-outline-variant">
        <p className="text-label-sm font-label-sm text-on-surface-variant">
          Platform super-admin · {user?.locality?.name ?? "No locality"}
        </p>
        <div className="flex items-center gap-2.5">
          <span className="text-label-md font-label-md text-on-background hidden sm:block">
            {user?.full_name}
          </span>
          <Avatar name={user?.full_name ?? "?"} size="sm" className="border border-outline-variant" />
        </div>
      </div>
    </>
  );
}
