"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { mainNavItems } from "@/config/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useUnreadCounts } from "@/features/messaging/hooks";
import { CountBadge } from "@/components/ui/count-badge";
import {
  Home, MapPin, Plus, HandHeart, User as UserIcon, Bell, AlertCircle, Settings, Sparkles, LogOut, MessageSquare,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Home,
  MapPin,
  Plus,
  HandHeart,
  User: UserIcon,
  Bell,
  AlertCircle,
  Settings,
  MessageSquare,
};

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { messages: unreadMessages, notifications: unreadNotifications } = useUnreadCounts();

  const sidebarItems = mainNavItems.filter((item) => !item.mobileOnly);

  const unreadFor = (href: string): number => {
    if (href === "/messages") return unreadMessages;
    if (href === "/notifications") return unreadNotifications;
    return 0;
  };

  return (
    <aside
      aria-label="Desktop navigation"
      className={cn(
        "hidden lg:flex flex-col sticky top-0 h-screen w-72 shrink-0 z-20",
        "bg-surface-container-lowest border-r border-outline-variant/30",
        "p-6 soft-card-shadow overflow-y-auto"
      )}
    >
      {/* Brand Header */}
      <Link
        href="/home"
        id="sidebar-brand"
        className="flex items-center gap-3 mb-8 group"
      >
        <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-on-primary font-bold text-xl shadow-md transition-transform group-hover:scale-105">
          A
        </div>
        <div>
          <h1 className="headline-md text-primary font-extrabold tracking-tight leading-none">
            Aas-Paas
          </h1>
          <p className="label-sm text-on-surface-variant/80 mt-1 flex items-center gap-1">
            <Sparkles size={12} className="text-secondary" /> Soft Signature
          </p>
        </div>
      </Link>

      {/* Navigation Items */}
      <nav className="flex flex-col gap-2 flex-1">
        {sidebarItems.map((item) => {
          const Icon = iconMap[item.icon];
          const isActive =
            pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              id={`sidebar-nav-${item.icon.toLowerCase()}`}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3.5 px-4 py-3 rounded-2xl font-semibold label-md",
                "transition-all duration-180 ease-out",
                isActive
                  ? "bg-secondary-container text-on-secondary-container shadow-xs"
                  : "text-on-surface hover:bg-surface-container hover:text-primary"
              )}
            >
              {Icon && (
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-on-secondary-container" : "text-on-surface-variant"}
                  aria-hidden="true"
                />
              )}
              <span className="flex-1 truncate">{item.label}</span>
              <CountBadge count={unreadFor(item.href)} />
            </Link>
          );
        })}
      </nav>

      {/* Quick Action & User Profile Footer */}
      <div className="mt-auto pt-6 flex flex-col gap-4 border-t border-outline-variant/20">
        <Link
          href="/create"
          id="sidebar-create"
          className={cn(
            "flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl",
            "bg-primary text-on-primary font-semibold label-md shadow-md",
            "hover:bg-primary-container hover:text-on-primary-container transition-all hover-lift"
          )}
        >
          <Plus size={20} />
          <span>Create Post</span>
        </Link>

        {user && (
          <div className="flex items-center justify-between p-2 rounded-2xl bg-surface-container-low">
            <Link href="/profile" className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-secondary-container text-on-secondary-container font-bold flex items-center justify-center text-sm shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  user.full_name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <div className="min-w-0">
                <p className="label-md text-on-surface truncate font-bold">{user.full_name}</p>
                <p className="label-sm text-on-surface-variant truncate">{user.neighbourhood || "Neighbour"}</p>
              </div>
            </Link>
            <button
              onClick={logout}
              title="Log out"
              className="p-2 text-on-surface-variant hover:text-error hover:bg-error-container/30 rounded-xl transition-colors shrink-0"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
