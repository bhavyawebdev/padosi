/**
 * navigation.ts — Navigation items and route definitions
 *
 * Mobile (bottom bar, 4 items + center Create):
 *   Home | Help | [+Create] | Need | Profile
 *
 * Desktop/tablet (left sidebar):
 *   Home, Nearby, Verified Help, Need It Now, Messages,
 *   Notifications, Settings + New Post action at top
 */

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  /** Show only on mobile bottom bar */
  mobileOnly?: boolean;
  /** Show only on desktop sidebar */
  desktopOnly?: boolean;
}

/** Primary navigation items for the (app) route group — used by desktop sidebar */
export const mainNavItems: NavItem[] = [
  {
    label: "Home",
    href: "/home",
    icon: "Home",
  },
  {
    label: "Nearby",
    href: "/nearby",
    icon: "MapPin",
    desktopOnly: true,
  },
  {
    label: "Verified Help",
    href: "/help",
    icon: "HandHeart",
  },
  {
    label: "Need It Now",
    href: "/need",
    icon: "AlertCircle",
  },
  {
    label: "Messages",
    href: "/messages",
    icon: "MessageSquare",
    desktopOnly: true,
  },
  {
    label: "Notifications",
    href: "/notifications",
    icon: "Bell",
    desktopOnly: true,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: "Settings",
    desktopOnly: true,
  },
];

/**
 * Mobile bottom bar items.
 * Exactly 4 items + 1 center Create action = 5 slots total.
 * Spec: Home | Help | [+Create] | Need | Profile
 */
export const mobileNavItems: NavItem[] = [
  { label: "Home",    href: "/home",    icon: "Home" },
  { label: "Help",    href: "/help",    icon: "HandHeart" },
  { label: "Create",  href: "/create",  icon: "Plus" },
  { label: "Need",    href: "/need",    icon: "AlertCircle" },
  { label: "Profile", href: "/profile", icon: "User" },
];

