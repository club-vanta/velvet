import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { components } from "@/api/types";
import { FaceCard, type Align, type Shown } from "./CrowdFace";

type NightGuest = components["schemas"]["NightGuestPublic"];

/**
 * One card for a group of faces, shown on hover or on a tap. Spread
 * `containerProps` on the faces' positioned (`relative`) container, render
 * `card` inside it, and pass `show` to each Face. `showBack` adds whether the
 * person came back, which says nothing where everyone shown came back.
 */
export function useFaceCard({ showBack }: { showBack: boolean }) {
  const [shown, setShown] = useState<Shown | null>(null);
  const container = useRef<HTMLDivElement>(null);

  // A finger lifting also "leaves", so a tapped card stays until a tap lands
  // anywhere but one of this group's faces; a face of another group opens
  // that group's card instead.
  useEffect(() => {
    if (!shown) return;
    function close(event: globalThis.PointerEvent) {
      const face = (event.target as Element).closest("[data-guest]");
      if (!face || !container.current?.contains(face)) setShown(null);
    }
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [shown]);

  function show(face: HTMLElement, guest: NightGuest) {
    const width = face.offsetParent?.clientWidth ?? 0;
    const center = face.offsetLeft + face.offsetWidth / 2;
    // Near an edge a centred card would leave the screen on a phone.
    const align: Align =
      center < width / 3
        ? "start"
        : center > (width * 2) / 3
          ? "end"
          : "center";
    setShown({
      guest,
      x: {
        start: face.offsetLeft,
        center,
        end: face.offsetLeft + face.offsetWidth,
      }[align],
      y: face.offsetTop,
      align,
    });
  }

  return {
    show,
    card: shown && <FaceCard shown={shown} showBack={showBack} />,
    containerProps: {
      ref: container,
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType !== "touch") setShown(null);
      },
    },
  };
}
