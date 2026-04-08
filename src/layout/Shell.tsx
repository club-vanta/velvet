import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  LayoutDashboard,
  CalendarDays,
  Users,
  ShieldCheck,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: false,
  },
  { label: "Meetups", href: "/meetups", icon: CalendarDays, adminOnly: false },
  { label: "Guests", href: "/guests", icon: Users, adminOnly: false },
  { label: "Staff", href: "/staff", icon: ShieldCheck, adminOnly: true },
  { label: "Audit Log", href: "/events", icon: ScrollText, adminOnly: true },
];

function NavLinks({
  isAdmin,
  pending,
  location,
}: {
  isAdmin: boolean;
  pending: number;
  location: string;
}) {
  return (
    <>
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
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

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
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
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo badge */}
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm leading-none">
              V
            </span>
          </div>
          <span className="font-semibold text-sm tracking-tight">
            Alter Tracker
          </span>
        </div>
        <div className="flex items-center gap-3">
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
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <nav className="hidden md:flex w-56 border-r border-border flex-col gap-1 p-2 shrink-0">
          <NavLinks
            isAdmin={isAdmin}
            pending={pendingCount}
            location={location.pathname}
          />
          <div className="mt-auto">
            <Separator className="my-2" />
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {isAdmin ? "Admin" : "Staff"}
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-background flex items-stretch">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
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
