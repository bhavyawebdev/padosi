import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { HomeFeedPage } from "@/pages/HomeFeedPage";
import { DirectoryPage } from "@/pages/DirectoryPage";
import { ProviderDetailPage } from "@/pages/ProviderDetailPage";
import { RequestsPage } from "@/pages/RequestsPage";
import { RequestDetailPage } from "@/pages/RequestDetailPage";
import { PostDetailPage } from "@/pages/PostDetailPage";
import { SearchPage } from "@/pages/SearchPage";
import { SavedPage } from "@/pages/SavedPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { MessagesPage } from "@/pages/MessagesPage";
import { MapPage } from "@/pages/MapPage";
import { AdminPage } from "@/pages/AdminPage";

/** Auth pages redirect to the app when already signed in. */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/nearby" replace />;
  return children;
}

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <PublicOnly><LoginPage /></PublicOnly> },
  { path: "/signup", element: <PublicOnly><SignupPage /></PublicOnly> },
  { path: "/forgot-password", element: <PublicOnly><ForgotPasswordPage /></PublicOnly> },
  { path: "/reset-password", element: <PublicOnly><ResetPasswordPage /></PublicOnly> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { path: "nearby", element: <HomeFeedPage /> },
      { path: "help", element: <DirectoryPage /> },
      { path: "providers/:id", element: <ProviderDetailPage /> },
      { path: "needs", element: <RequestsPage /> },
      { path: "requests/:id", element: <RequestDetailPage /> },
      { path: "posts/:id", element: <PostDetailPage /> },
      { path: "map", element: <MapPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "saved", element: <SavedPage /> },
      { path: "messages", element: <MessagesPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminPage section="overview" /> },
      { path: "users", element: <AdminPage section="users" /> },
      { path: "posts", element: <AdminPage section="posts" /> },
      { path: "requests", element: <AdminPage section="requests" /> },
      { path: "providers", element: <AdminPage section="providers" /> },
      { path: "reports", element: <AdminPage section="reports" /> },
    ],
  },
  { path: "*", element: <Navigate to="/nearby" replace /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
