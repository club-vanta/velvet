import { useViewer } from "../access";
import { usePendingStaffCount } from "./api/usePendingStaffCount";
import { BottomNav } from "./components/BottomNav";
import { SidebarNav } from "./components/SidebarNav";
import { TopBar } from "./components/TopBar";
import { useSidebarOpen } from "./hooks/useSidebarOpen";
import { visibleNavItems } from "./navItems";

/** The signed-in layout: top bar, sidebar (desktop) or bottom nav (phones). */
export function Shell({ children }: { children: React.ReactNode }) {
  const viewer = useViewer();
  const items = visibleNavItems(viewer);
  const badges = { staff: usePendingStaffCount(viewer.isSiteAdmin) };
  const [sidebarOpen, toggleSidebar] = useSidebarOpen();

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={toggleSidebar} />

      <div className="flex flex-1 overflow-hidden">
        <SidebarNav items={items} badges={badges} open={sidebarOpen} />
        <main
          // Bottom padding clears the phone BottomNav (4rem) plus 1rem so the
          // last item never sits flush on it; desktop has no bottom nav.
          className="flex-1 overflow-auto p-4 pb-[calc(4rem+1rem)] md:p-6 md:pb-6"
        >
          {children}
        </main>
      </div>

      <BottomNav items={items} badges={badges} />
    </div>
  );
}
