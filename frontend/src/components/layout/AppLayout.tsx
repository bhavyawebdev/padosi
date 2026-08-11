import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LoadingState } from "@/components/common/Feedback";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "./AppHeader";
import { BottomNav } from "./BottomNav";

export function AppLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingState label="Waking up the neighborhood…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-background font-body-md text-body-md pt-[calc(64px+env(safe-area-inset-top))] pb-28 md:pb-0">
      <AppHeader />
      <main
        key={location.pathname}
        className="flex-grow w-full max-w-[1200px] mx-auto px-margin-mobile md:px-margin-desktop py-5 animate-fade-in"
      >
        <Outlet />
      </main>
      <BottomNav />
      <ChatWidget />
    </div>
  );
}
