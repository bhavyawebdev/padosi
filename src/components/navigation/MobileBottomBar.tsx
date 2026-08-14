"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { mobileNavItems } from "@/config/navigation";
import {
  Home, MapPin, Plus, HandHeart, User, Bell, AlertCircle, Settings,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Home,
  MapPin,
  Plus,
  HandHeart,
  User,
  Bell,
  AlertCircle,
  Settings,
};

export function MobileBottomBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 lg:hidden",
        "flex items-center justify-around h-16 px-2",
        "bg-surface-container-lowest border-t border-outline-variant/30 shadow-lg",
        "safe-area-bottom"
      )}
    >
      {mobileNavItems.map((item) => {
        const Icon = iconMap[item.icon];
        const isCreate = item.href === "/create";
        const isActive = !isCreate && (
          pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href))
        );

        if (isCreate) {
          return (
            <Link
              key={item.href}
              href={item.href}
              id="nav-mobile-create"
              aria-label={item.label}
              className="flex flex-col items-center justify-center -mt-6"
            >
              <div
                className={cn(
                  "flex items-center justify-center h-14 w-14 rounded-full",
                  "bg-primary text-on-primary shadow-lg shadow-primary/30",
                  "transition-transform duration-180 active:scale-95 hover:scale-105"
                )}
                aria-hidden="true"
              >
                {Icon && <Icon size={26} strokeWidth={2.5} />}
              </div>
              <span className="label-sm mt-1 text-on-surface-variant font-semibold">
                {item.label}
              </span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            id={`nav-mobile-${item.icon.toLowerCase()}`}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl gap-0.5",
              "transition-all duration-180 ease-out",
              isActive
                ? "bg-secondary-container text-on-secondary-container font-bold"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container/50"
            )}
          >
            {Icon && (
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 2}
                aria-hidden="true"
              />
            )}
            <span className="label-sm font-semibold">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
