import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";

/**
 * Signs out and drops every cached query, so the next person on this device
 * cannot bring back the previous session's data (back button, other org).
 */
export function LogoutButton() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate("/");
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      className="gap-2"
      data-cy="shell-logout"
    >
      <LogOut className="h-4 w-4" aria-hidden />
      {/* Icon-only on phones, but still named for screen readers. */}
      <span className="sr-only sm:not-sr-only">{t("logout")}</span>
    </Button>
  );
}
