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
    <div className="min-h-screen flex flex-col bg-background text-on-background">
      <AppHeader />
      <main
        key={location.pathname}
        className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-10 py-10 animate-fade-in"
      >
        <Outlet />
      </main>
      <BottomNav />
      <ChatWidget />
    </div>
  );
}
