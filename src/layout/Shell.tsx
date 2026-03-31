import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, LayoutDashboard, CalendarDays, Users, ShieldCheck, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, adminOnly: false },
  { label: "Meetups", href: "/meetups", icon: CalendarDays, adminOnly: false },
  { label: "Guests", href: "/guests", icon: Users, adminOnly: false },
  { label: "Staff", href: "/staff", icon: ShieldCheck, adminOnly: true },
  { label: "Audit Log", href: "/events", icon: ScrollText, adminOnly: true },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role.name === "ADMIN";

  const { data: pending } = useQuery({
    queryKey: ["staff", "pending"],
    queryFn: async () => {
      const { data } = await api.GET("/staff/pending");
      return data ?? [];
    },
    enabled: isAdmin,
  });

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Topbar */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          {/* Logo badge */}
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm leading-none">V</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Alter Tracker</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user?.username}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <nav className="w-56 border-r border-border flex flex-col gap-1 p-2 shrink-0">
          {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            const active = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
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
                {item.href === "/staff" && isAdmin && (pending?.length ?? 0) > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                    {pending!.length}
                  </Badge>
                )}
              </Link>
            );
          })}

          <div className="mt-auto">
            <Separator className="my-2" />
            <div className="px-3 py-2 text-xs text-muted-foreground">
              {isAdmin ? "Admin" : "Staff"}
            </div>
          </div>
        </nav>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
