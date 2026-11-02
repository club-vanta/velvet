import { NavLink } from "react-router-dom";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { NavItem } from "../navItems";
import { PendingBadge } from "./PendingBadge";

/** The desktop sidebar; hidden on phones, where BottomNav takes over. */
export function SidebarNav({
  items,
  badges,
  open,
}: {
  items: NavItem[];
  /** Counts shown next to an item, by item id. */
  badges: Partial<Record<string, number>>;
  open: boolean;
}) {
  const { t } = useLanguage();
  return (
    <nav
      aria-label={t("mainNavigation")}
      data-cy="shell-sidebar"
      className={cn(
        "hidden border-r border-border flex-col gap-1 p-2 shrink-0 w-56",
        open ? "md:flex" : "md:hidden",
      )}
    >
      {items.map((item) => (
        <NavLink
          key={item.id}
          to={item.href}
          data-cy={`shell-sidebar-link-${item.id}`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive
                ? "bg-secondary text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )
          }
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1">{t(item.label)}</span>
          <PendingBadge count={badges[item.id] ?? 0} />
        </NavLink>
      ))}
    </nav>
  );
}
