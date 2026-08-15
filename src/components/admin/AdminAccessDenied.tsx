import { useNavigate } from "react-router-dom";

import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { Tag } from "@/components/common/Chip";
import { useAuth } from "@/hooks/useAuth";

const ROLE_LABEL: Record<string, string> = {
  individual: "Individual",
  business: "Business",
  community: "Community",
  admin: "Admin",
};

export function AdminAccessDenied() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const switchAccount = () => {
    logout();
    navigate("/admin", { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center py-16 px-5 text-center">
      <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-4">
        <span aria-hidden className="material-symbols-outlined text-[32px]">
          admin_panel_settings
        </span>
      </div>
      <h2 className="text-headline-md font-headline-md text-on-background">
        Admin access required
      </h2>
      <p className="text-body-md font-body-md text-on-surface-variant max-w-md mt-2">
        You're signed in as <span className="text-on-surface font-semibold">{user?.full_name}</span>{" "}
        ({user?.role ? ROLE_LABEL[user.role] : "unknown"} account). This area is reserved for
        platform <span className="text-on-surface font-semibold">admins</span> and{" "}
        <span className="text-on-surface font-semibold">community (RWA)</span> accounts.
      </p>

      {user && (
        <div className="mt-6 w-full max-w-sm bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm text-left">
          <div className="flex items-center gap-3">
            <Avatar name={user.full_name} size="md" />
            <div className="min-w-0 flex-1">
              <p className="text-label-md font-label-md text-on-background truncate">{user.full_name}</p>
              <p className="text-label-sm font-label-sm text-on-surface-variant truncate">{user.email}</p>
            </div>
            <Tag label={ROLE_LABEL[user.role] ?? user.role} tone="neutral" />
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
        <Button icon="logout" onClick={switchAccount}>
          Switch account
        </Button>
        <Button variant="secondary" icon="explore" onClick={() => navigate("/nearby")}>
          Back to Nearby
        </Button>
      </div>
    </div>
  );
}
