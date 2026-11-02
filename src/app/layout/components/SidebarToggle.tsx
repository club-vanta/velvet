import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** Shows or hides the desktop sidebar; phones use the bottom nav instead. */
export function SidebarToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useLanguage();
  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      aria-label={t(open ? "hideSidebar" : "showSidebar")}
      aria-expanded={open}
      data-cy="shell-sidebar-toggle"
      className="hidden md:flex h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Button>
  );
}
