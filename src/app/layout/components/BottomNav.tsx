import { NavLink } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NavBadges, NavItem } from "../navItems";
import { PendingBadge } from "./PendingBadge";

// Keep in sync with the bottom padding of the Shell's <main>.
const MOBILE_NAV_HEIGHT = "4rem";

/** The phone navigation bar, fixed to the bottom; hidden from md up. */
export function BottomNav({
  items,
  badges,
}: {
  items: NavItem[];
  /** Counts shown on an item's icon, by item id. */
  badges: NavBadges;
}) {
  const { t } = useLanguage();
  return (
    <nav
      aria-label={t("mainNavigation")}
      data-cy="shell-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background flex items-stretch"
      style={{ height: MOBILE_NAV_HEIGHT }}
    >
      {items.map((item) => (
        <NavLink
          key={item.id}
          to={item.href}
          data-cy={`shell-bottom-link-${item.id}`}
          className={({ isActive }) =>
            cn(
              // min-w-0 lets a slot shrink below its label, so seven items
              // share a 375px screen without labels spilling.
              "flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-[11px] tracking-tight transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              isActive ? "text-foreground" : "text-muted-foreground",
            )
          }
        >
          <div className="relative">
            <item.icon className="h-5 w-5" aria-hidden />
            <PendingBadge
              count={badges[item.id] ?? 0}
              className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 text-[10px]"
            />
          </div>
          <span data-cy="shell-bottom-label" className="max-w-full truncate">
            {t(item.shortLabel ?? item.label)}
          </span>
        </NavLink>
      ))}
    </nav>
  );
}
