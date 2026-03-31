import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, LayoutDashboard, CalendarDays, Users, ShieldCheck, ScrollText, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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

function NavLinks({
  isAdmin,
  pending,
  location,
  onNavigate,
}: {
  isAdmin: boolean;
  pending: number;
  location: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active = location === item.href || location.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={onNavigate}
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
            {pendingCount > 0 && isAdmin && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Button>
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

        {/* Drawer — mobile only */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-64 p-2 pt-10 flex flex-col gap-1">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <NavLinks
              isAdmin={isAdmin}
              pending={pendingCount}
              location={location.pathname}
              onNavigate={() => setDrawerOpen(false)}
            />
            <div className="mt-auto">
              <Separator className="my-2" />
              <div className="px-3 py-2 text-xs text-muted-foreground">
                {isAdmin ? "Admin" : "Staff"}
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
