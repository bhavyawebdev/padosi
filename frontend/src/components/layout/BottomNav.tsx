import { NavLink } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";

const ITEMS = [
  { to: "/nearby", label: "Nearby", icon: "explore" },
  { to: "/help", label: "Help", icon: "verified_user" },
  { to: "/needs", label: "Needs", icon: "bolt" },
  { to: "/saved", label: "Saved", icon: "bookmark" },
  { to: "/profile", label: "Profile", icon: "person" },
];

export function BottomNav() {
  const { user } = useAuth();
  const items =
    user && (user.role === "admin" || user.role === "community")
      ? [ITEMS[0], ITEMS[1], { to: "/admin", label: "Admin", icon: "admin_panel_settings" }, ITEMS[3], ITEMS[4]]
      : ITEMS;

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 pb-sm pt-xs bg-surface-container-low border-t border-outline-variant/30 shadow-[0_-1px_4px_rgba(0,0,0,0.05)]"
    >
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center px-4 py-1 rounded-full transition-all active:scale-95",
              isActive
                ? "bg-primary-container text-on-primary-container"
                : "text-on-surface-variant hover:text-primary",
            )
          }
        >
          <span aria-hidden className="material-symbols-outlined mb-1">
            {item.icon}
          </span>
          <span className="text-label-sm font-label-sm">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
