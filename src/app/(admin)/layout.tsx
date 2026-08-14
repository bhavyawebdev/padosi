import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionRole, CAN } from "@/lib/auth/roles";
import { ShieldCheck, LayoutDashboard, Users, Flag, ScrollText, Home } from "lucide-react";

/**
 * Admin area layout — the security boundary is SERVER-SIDE.
 *
 * Visiting /admin while not an authenticated admin (or while the profiles
 * table is unavailable) redirects immediately; no admin UI, data or client
 * role flags are ever rendered for unauthorized users.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionRole();

  if (!session.user || !CAN.admin(session.user.role) || session.user.status !== "active") {
    redirect("/home");
  }

  const nav = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/moderation", label: "Moderation", icon: Flag },
    { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-surface flex">
      <aside className="hidden md:flex w-64 flex-col border-r border-outline-variant/30 bg-surface-container-lowest sticky top-0 h-screen">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary-container flex items-center justify-center">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <p className="label-lg text-on-surface font-bold leading-tight">Admin</p>
              <p className="label-sm text-on-surface-variant">Aas-Paas</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl label-md text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-outline-variant/20">
          <Link
            href="/home"
            className="flex items-center gap-2 label-md text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Home size={16} />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-h-screen">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-outline-variant/30 bg-surface-container-lowest">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary-container flex items-center justify-center">
              <ShieldCheck size={16} className="text-primary" />
            </div>
            <span className="label-lg text-on-surface font-bold">Admin</span>
          </div>
          <Link href="/home" className="label-sm text-on-surface-variant">
            Back to app
          </Link>
        </div>
        <div className="md:hidden flex gap-1 px-3 py-2 overflow-x-auto border-b border-outline-variant/20">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap px-3 py-1.5 rounded-full label-sm text-on-surface-variant bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
