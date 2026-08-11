import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/common/Avatar";
import { useConversations } from "@/features/messages/messagesHooks";
import { LocalitySwitcher } from "./LocalitySwitcher";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

const NAV_ITEMS = [
  { to: "/nearby", label: "Nearby", icon: "explore" },
  { to: "/help", label: "Help", icon: "verified_user" },
  { to: "/needs", label: "Needs", icon: "bolt" },
  { to: "/profile", label: "Profile", icon: "person" },
];

/**
 * App header — every device size.
 * - Mobile (<md): logo + icon cluster (search / theme / bell / avatar).
 *   Locality switching lives on the feed page for mobile.
 * - Tablet (md–xl): icon-only nav pills so the row never crowds.
 * - Desktop (xl+): full pill labels + locality switcher.
 */
export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items =
    user && (user.role === "admin" || user.role === "community")
      ? [...NAV_ITEMS.slice(0, -1), { to: "/admin", label: "Admin", icon: "admin_panel_settings" }, NAV_ITEMS[NAV_ITEMS.length - 1]]
      : NAV_ITEMS;

  return (
    <header className="safe-top fixed top-0 left-0 right-0 z-40 bg-background border-b border-outline-variant flex items-center justify-between gap-2 w-full px-margin-mobile md:px-margin-desktop pb-2">
      <Link to="/nearby" aria-label="LocalPulse home" className="flex items-center shrink-0">
        <Logo />
      </Link>

      {/* Desktop nav pills — icon-only on tablet, full labels on xl+ */}
      <nav className="hidden md:flex items-center gap-0.5 lg:gap-1" aria-label="Main">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-1.5 rounded-full px-2.5 lg:px-4 py-2 text-label-md font-label-md transition-colors",
                isActive
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-variant",
              )
            }
          >
            <span aria-hidden className="material-symbols-outlined text-[18px]">
              {item.icon}
            </span>
            <span className="hidden xl:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-1 md:gap-2">
        {/* Locality switcher — desktop (xl) only; mobile gets it on the feed page */}
        <LocalitySwitcher className="hidden xl:block" />

        <Link
          to="/map"
          aria-label="Area map"
          className="hidden sm:flex p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
        >
          <span aria-hidden className="material-symbols-outlined">
            map
          </span>
        </Link>

        <Link
          to="/search"
          aria-label="Search"
          className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
        >
          <span aria-hidden className="material-symbols-outlined">
            search
          </span>
        </Link>

        <MessagesLink />

        <ThemeToggle />

        {user && (
          <>
            <NotificationBell />
            <Link to="/profile" aria-label="Open profile" className="block">
              <Avatar name={user.full_name} size="md" className="border border-outline-variant shadow-sm" />
            </Link>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              aria-label="Sign out"
              className="hidden md:flex p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
            >
              <span aria-hidden className="material-symbols-outlined">
                logout
              </span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

/** Inbox link with a live unread badge (shares the inbox query cache). */
function MessagesLink() {
  const { data } = useConversations();
  const unread = (data ?? []).reduce((sum, c) => sum + c.unread_count, 0);
  return (
    <Link
      to="/messages"
      aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ""}`}
      className="relative p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
    >
      <span aria-hidden className="material-symbols-outlined">
        chat_bubble
      </span>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-label-sm font-label-sm font-bold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
