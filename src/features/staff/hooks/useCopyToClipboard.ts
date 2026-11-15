import { useEffect, useRef, useState } from "react";

const COPIED_MS = 2000;

/**
 * Copies text to the clipboard; `copied` stays true for two seconds after a
 * successful copy so the button can say so.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  // Started with the state change, not in an effect after the render, so the
  // reset is always scheduled by the time "Copied!" shows.
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  function copy(text: string) {
    // A refused write (no permission) or a missing clipboard (plain http
    // outside localhost) just never says "Copied!"; the code stays on
    // screen to copy by hand.
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(text).then(
      () => {
        clearTimeout(resetTimer.current);
        resetTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
        setCopied(true);
      },
      () => setCopied(false),
    );
  }

  return { copied, copy };
}
