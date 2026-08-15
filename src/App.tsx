import { Navigate, createBrowserRouter, RouterProvider } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { homePathForRole } from "@/lib/roles";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { AdminLoginPage } from "@/pages/auth/AdminLoginPage";
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
import { CommunityDashboardPage } from "@/pages/CommunityDashboardPage";
import { BusinessDashboardPage } from "@/pages/BusinessDashboardPage";

/** Auth pages redirect to the app when already signed in (role-aware). */
function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={homePathForRole(user.role)} replace />;
  return children;
}

/**
 * /admin entry — the ONLY thing shown to signed-out visitors is the Admin
 * Login. Signed-in admins are forwarded to the console; community accounts
 * are sent to their own customer-side dashboard (admin is platform-admin
 * only); everyone else gets a safe denial (no admin information revealed).
 */
function AdminEntry() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <AdminLoginPage />;
  if (user.role === "admin") {
    return <Navigate to="/admin/dashboard" replace />;
  }
  if (user.role === "community") {
    return <Navigate to="/community" replace />;
  }
  return <AdminAccessDenied />;
}

const router = createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/login", element: <PublicOnly><LoginPage /></PublicOnly> },
  { path: "/signup", element: <PublicOnly><SignupPage /></PublicOnly> },
  { path: "/forgot-password", element: <PublicOnly><ForgotPasswordPage /></PublicOnly> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
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
      { path: "community", element: <CommunityDashboardPage /> },
      { path: "business", element: <BusinessDashboardPage /> },
    ],
  },
  // Admin Portal — a separate experience with its own layout and login.
  { path: "/admin", element: <AdminEntry /> },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { path: "dashboard", element: <AdminPage section="overview" /> },
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
