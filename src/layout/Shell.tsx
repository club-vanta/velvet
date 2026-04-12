import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Users,
  ShieldCheck,
  ScrollText,
  Languages,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MOBILE_NAV_HEIGHT = "4rem"; // keep in sync with the bottom nav's height

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly: boolean;
};

function NavLinks({
  isAdmin,
  pending,
  location,
  navItems,
}: {
  isAdmin: boolean;
  pending: number;
  location: string;
  navItems: NavItem[];
}) {
  return (
    <>
      {navItems
        .filter((item) => !item.adminOnly || isAdmin)
        .map((item) => {
          const active =
            location === item.href || location.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-secondary text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/staff" && isAdmin && pending > 0 && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                  {pending}
                </Badge>
              )}
            </Link>
          );
        })}
    </>
  );
}

const SIDEBAR_KEY = "sidebar_open";

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) !== "false",
  );

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }

  const navItems: NavItem[] = [
    {
      label: t("navDashboard"),
      href: "/dashboard",
      icon: LayoutDashboard,
      adminOnly: false,
    },
    {
      label: t("navMeetups"),
      href: "/meetups",
      icon: CalendarDays,
      adminOnly: false,
    },
    { label: t("navGuests"), href: "/guests", icon: Users, adminOnly: false },
    {
      label: t("navStaff"),
      href: "/staff",
      icon: ShieldCheck,
      adminOnly: true,
    },
    {
      label: t("navAuditLog"),
      href: "/events",
      icon: ScrollText,
      adminOnly: true,
    },
  ];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = user?.role.name === "ADMIN";

  const { data: pending } = useQuery({
    queryKey: ["staff", "pending"],
    queryFn: async () => {
      const { data } = await api.GET("/staff/pending");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  const pendingCount = pending?.length ?? 0;

  function handleLogout() {
    logout();
    queryClient.clear();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="h-14 border-b border-border flex items-center px-4 shrink-0">
        {/* Left: controls */}
        <div className="flex items-center gap-1 flex-1">
          {/* Sidebar toggle — desktop only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="hidden md:flex h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="h-4 w-4" />
            ) : (
              <PanelLeftOpen className="h-4 w-4" />
            )}
          </Button>
          {/* Language dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 h-7"
              >
                <Languages className="h-3.5 w-3.5" />
                {lang === "es" ? "🇦🇷" : "🇺🇸"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => setLang("es")}
                className={cn(lang === "es" && "font-medium")}
              >
                🇦🇷 Español
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setLang("en")}
                className={cn(lang === "en" && "font-medium")}
              >
                🇺🇸 English
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Center: logo + title */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm leading-none">
              V
            </span>
          </div>
          <span className="font-semibold text-sm tracking-tight">
            Alter Tracker
          </span>
        </div>

        {/* Right: user + logout */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <span className="text-sm text-muted-foreground">
            {user?.username}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">{t("logout")}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <nav
          className={cn(
            "hidden border-r border-border flex-col gap-1 p-2 shrink-0 w-56",
            sidebarOpen ? "md:flex" : "md:hidden",
          )}
        >
          <NavLinks
            isAdmin={isAdmin}
            pending={pendingCount}
            location={location.pathname}
            navItems={navItems}
          />
        </nav>

        {/* Page content */}
        <main
          className="flex-1 overflow-auto p-4 md:p-6 md:pb-6"
          style={{ paddingBottom: MOBILE_NAV_HEIGHT }}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background flex items-stretch"
        style={{ height: MOBILE_NAV_HEIGHT }}
      >
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const active =
              location.pathname === item.href ||
              location.pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors relative",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {item.href === "/staff" && isAdmin && pendingCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1.5 -right-2 h-4 min-w-4 px-1 text-[10px]"
                    >
                      {pendingCount}
                    </Badge>
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
      </nav>
    </div>
  );
}
