import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

// aria-disabled rather than disabled: a disabled button drops the keyboard
// focus that just pressed it at the end of the track.
const ARROW_CLASS = "aria-disabled:cursor-default aria-disabled:opacity-50";

export interface CarouselSlide {
  id: string;
  /** Names the slide on its tab and for screen readers. */
  label: string;
  content: React.ReactNode;
}

type CarouselProps = {
  label: string;
  slides: CarouselSlide[];
  "data-cy"?: string;
};

/**
 * Slides that take the space of one, side by side in a native scroll-snap
 * track: swipe on a phone, or use the arrows and the named tabs. A single
 * slide renders on its own, with no controls.
 */
export function Carousel(props: CarouselProps) {
  if (props.slides.length === 1) return <>{props.slides[0].content}</>;
  // Its own component, so a track that comes back starts on the first slide
  // with its state, not on the slide an earlier track was showing.
  return <CarouselTrack {...props} />;
}

function CarouselTrack({ label, slides, "data-cy": dataCy }: CarouselProps) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const first = active === 0;
  const last = active === slides.length - 1;

  // The track scrolls by whole slides; CSS smooths it unless motion is reduced.
  const goTo = (index: number) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: index * track.clientWidth });
  };

  // Follows swipes, arrow keys and focus moving into another slide (the
  // browser scrolls it into view), so the tabs always match the view.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setActive(Math.round(track.scrollLeft / track.clientWidth));
  };

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="space-y-2"
      data-cy={dataCy}
    >
      <div className="flex items-center gap-1">
        <div className="flex flex-1 flex-wrap gap-1">
          {slides.map((slide, i) => (
            <Button
              key={slide.id}
              variant={i === active ? "secondary" : "ghost"}
              size="sm"
              aria-current={i === active ? "true" : undefined}
              onClick={() => goTo(i)}
              data-cy={`carousel-tab-${slide.id}`}
            >
              {slide.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("carouselPrevious")}
          aria-disabled={first}
          onClick={() => !first && goTo(active - 1)}
          className={ARROW_CLASS}
          data-cy="carousel-previous"
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("carouselNext")}
          aria-disabled={last}
          onClick={() => !last && goTo(active + 1)}
          className={ARROW_CLASS}
          data-cy="carousel-next"
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <div
        ref={trackRef}
        onScroll={onScroll}
        // Focusable, so the arrow keys scroll it even when the slide in view
        // holds nothing to focus (axe: scrollable-region-focusable).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        className="flex rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring snap-x snap-mandatory items-start overflow-x-auto overscroll-x-contain motion-safe:scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={slide.label}
            // The track clips overflow, so keep 1px of room for card rings.
            className="w-full shrink-0 snap-start snap-always p-px"
            data-cy={`carousel-slide-${slide.id}`}
          >
            {slide.content}
          </div>
        ))}
      </div>
    </section>
  );
}
