import { useState } from "react";

const SIDEBAR_KEY = "sidebar_open";

/** Whether the desktop sidebar is open; the choice survives reloads. */
export function useSidebarOpen(): [open: boolean, toggle: () => void] {
  const [open, setOpen] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) !== "false",
  );

  function toggle() {
    const next = !open;
    localStorage.setItem(SIDEBAR_KEY, String(next));
    setOpen(next);
  }

  return [open, toggle];
}
