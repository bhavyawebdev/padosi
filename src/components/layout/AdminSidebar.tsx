import { Link, NavLink } from "react-router-dom";

import { cn } from "@/lib/cn";
import { Logo } from "./Logo";

/** One entry in the admin section navigation. */
export interface AdminNavSection {
  to: string;
  label: string;
  icon: string;
  end: boolean;
}

/**
 * Desktop admin sidebar — fixed full-height rail with the section nav and
 * account actions. Hidden below the `lg` breakpoint (mobile uses the pills
 * in AdminHeader).
 */
export function AdminSidebar({
  sections,
  onSignOut,
}: {
  sections: AdminNavSection[];
  onSignOut: () => void;
}) {
  return (
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
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-label-md font-label-md text-on-primary/80 hover:bg-on-primary/10 hover:text-on-primary transition-colors"
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            logout
          </span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
