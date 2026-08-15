import { Link, NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/common/Avatar";
import { useConversations } from "@/features/messages/messagesHooks";
import { LocalitySwitcher } from "./LocalitySwitcher";
import { NotificationBell } from "./NotificationBell";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/nearby", label: "Nearby Right Now", icon: "explore" },
  { to: "/help", label: "Verified Help", icon: "verified_user" },
  { to: "/needs", label: "Need It Now", icon: "bolt" },
];

/**
 * App header — matches the design reference sticky header with logo, nav, and profile.
 * All features restored: LocalitySwitcher, NotificationBell, Search, Map, Messages, ThemeToggle.
 */
export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // The admin portal is platform-admin only; community accounts use their
  // own customer-side dashboard.
  const items = user?.role === "admin" ? [...NAV_ITEMS, { to: "/admin", label: "Admin", icon: "admin_panel_settings" }] : NAV_ITEMS;

  return (
    <header className="safe-top sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-outline-variant/40 header-blur">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link to="/nearby" aria-label="Padosi home" className="flex items-center gap-2.5 shrink-0">
          <span className="material-symbols-outlined text-primary text-3xl">monitor_heart</span>
          <span className="font-headline-lg font-bold text-xl">Local<span className="text-primary">Pulse</span></span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 font-semibold text-sm" aria-label="Main">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "transition-colors",
                  isActive
                    ? "text-primary border-b-2 border-primary pb-1"
                    : "text-on-surface-variant hover:text-primary",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side: actions + avatar */}
        <div className="flex items-center gap-1 md:gap-2">
          {user ? (
            <>
              {/* Locality switcher — desktop only */}
              <LocalitySwitcher className="hidden xl:block" />

              <Link
                to="/map"
                aria-label="Area map"
                className="hidden sm:flex p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">map</span>
              </Link>

              <Link
                to="/search"
                aria-label="Search"
                className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined">search</span>
              </Link>

              <MessagesLink />

              <ThemeToggle />

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
                <span className="material-symbols-outlined">logout</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hidden sm:block text-sm font-semibold text-on-surface px-4 py-2.5 rounded-full hover:bg-surface-container transition-colors btn-press">
                Log in
              </Link>
              <Link to="/signup" className="bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-primary-container transition-colors shadow-sm btn-press">
                Find your area
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/** Inbox link with a live unread badge. */
function MessagesLink() {
  const { data } = useConversations();
  const unread = (data ?? []).reduce((sum, c) => sum + c.unread_count, 0);
  return (
    <Link
      to="/messages"
      aria-label={`Messages${unread > 0 ? `, ${unread} unread` : ""}`}
      className="relative p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
    >
      <span className="material-symbols-outlined">chat_bubble</span>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-label-sm font-label-sm font-bold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
