import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomBar } from "@/components/navigation/MobileBottomBar";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PresenceHeartbeat } from "@/components/auth/PresenceHeartbeat";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <PresenceHeartbeat />
      <div className="min-h-screen bg-surface flex">
        <DesktopSidebar />

        <main
          id="main-content"
          className="flex-1 min-h-screen overflow-y-auto px-4 py-6 md:px-8 md:py-8 pb-24 lg:pb-8"
          tabIndex={-1}
        >
          <div className="mx-auto w-full max-w-5xl">
            {children}
          </div>
        </main>

        <MobileBottomBar />
      </div>
    </ProtectedRoute>
  );
}
