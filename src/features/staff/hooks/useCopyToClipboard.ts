import { useEffect, useState } from "react";

const COPIED_MS = 2000;

/**
 * Copies text to the clipboard; `copied` stays true for two seconds after a
 * successful copy so the button can say so.
 */
export function useCopyToClipboard() {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  useEffect(() => {
    if (copiedAt === null) return;
    const timer = setTimeout(() => setCopiedAt(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copiedAt]);

  function copy(text: string) {
    // A refused write (no permission, insecure context) just never says
    // "Copied!"; the code stays on screen to copy by hand.
    void navigator.clipboard.writeText(text).then(
      () => setCopiedAt(Date.now()),
      () => setCopiedAt(null),
    );
  }

  return { copied: copiedAt !== null, copy };
}
