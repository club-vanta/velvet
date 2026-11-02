import { useAuth } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { LanguageMenu } from "./LanguageMenu";
import { LogoutButton } from "./LogoutButton";
import { OrgSwitcher } from "./OrgSwitcher";
import { SidebarToggle } from "./SidebarToggle";

export function TopBar({
  sidebarOpen,
  onToggleSidebar,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <header className="h-14 border-b border-border flex items-center px-4 shrink-0">
      <div className="flex items-center gap-1 flex-1">
        <SidebarToggle open={sidebarOpen} onToggle={onToggleSidebar} />
        <LanguageMenu />
        <OrgSwitcher />
      </div>

      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0"
        >
          <span className="text-primary-foreground font-bold text-sm leading-none">
            V
          </span>
        </div>
        <span className="hidden sm:inline font-semibold text-sm tracking-tight">
          {t("appName")}
        </span>
      </div>

      <div className="flex items-center gap-3 flex-1 justify-end">
        <span
          data-cy="shell-username"
          className="text-sm text-muted-foreground"
        >
          {user?.username}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
