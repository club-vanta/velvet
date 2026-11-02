import {
  Building2,
  CalendarDays,
  ChartColumn,
  LayoutDashboard,
  ScrollText,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";
import { canAccess, type Access, type Viewer } from "../access";

export type NavItemId =
  | "dashboard"
  | "meetups"
  | "guests"
  | "stats"
  | "staff"
  | "events"
  | "organizations";

/** Counts shown on nav items (the pending-approvals badge), by item id. */
export type NavBadges = Partial<Record<NavItemId, number>>;

export type NavItem = {
  /** Stable id for badges and tests (`shell-sidebar-link-<id>`). */
  id: NavItemId;
  href: string;
  icon: LucideIcon;
  label: TranslationKey;
  /** A shorter label for the phone bottom nav, when the full one is long. */
  shortLabel?: TranslationKey;
  access: Access;
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "navDashboard",
    access: "everyone",
  },
  {
    id: "meetups",
    href: "/meetups",
    icon: CalendarDays,
    label: "navMeetups",
    access: "everyone",
  },
  {
    id: "guests",
    href: "/guests",
    icon: Users,
    label: "navGuests",
    access: "everyone",
  },
  {
    id: "stats",
    href: "/stats",
    icon: ChartColumn,
    label: "navStats",
    shortLabel: "navStatsShort",
    access: "orgAdmin",
  },
  {
    id: "staff",
    href: "/staff",
    icon: ShieldCheck,
    label: "navStaff",
    access: "siteAdmin",
  },
  {
    id: "events",
    href: "/events",
    icon: ScrollText,
    label: "navAuditLog",
    shortLabel: "navAuditLogShort",
    access: "orgAdmin",
  },
  {
    id: "organizations",
    href: "/organizations",
    icon: Building2,
    label: "navOrganizations",
    shortLabel: "navOrganizationsShort",
    access: "orgAdmin",
  },
];

/** The nav items `viewer` may open, in menu order. */
export function visibleNavItems(viewer: Viewer): NavItem[] {
  return NAV_ITEMS.filter((item) => canAccess(item.access, viewer));
}
