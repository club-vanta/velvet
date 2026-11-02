import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrg, type ActiveOrg } from "@/domain/session";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MENU_TRIGGER_CLASS } from "./menuTrigger";

/**
 * Picks the organization every page works in. Switching goes to the
 * dashboard, since the page open may belong to the previous organization
 * (a meetup, a guest's attendance).
 */
export function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrg } = useOrg();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (orgs.length === 0) return null;

  function switchTo(org: ActiveOrg) {
    setActiveOrg(org);
    navigate("/dashboard");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-cy="shell-org-switcher"
        className={MENU_TRIGGER_CLASS}
      >
        <Building2 className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">{t("organizationMenu")}: </span>
        <span data-cy="shell-active-org" className="max-w-32 truncate">
          {activeOrg?.org_name ?? "—"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" data-cy="shell-org-menu">
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.org_id}
            data-cy={`shell-org-option-${org.org_id}`}
            onClick={() => switchTo(org)}
            className={cn(org.org_id === activeOrg?.org_id && "font-medium")}
          >
            {org.org_name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
