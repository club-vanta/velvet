import { ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/i18n";

/** What each mark of the meteogram means, and the zoom buttons at its end. */
export function MeteogramLegend({
  zoom,
  maxZoom,
  onZoom,
}: {
  zoom: number;
  maxZoom: number;
  onZoom: (zoom: number) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-muted-foreground/20" />
        {t("statsWeatherBefore")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-3.5 bg-chart-3" />
        {t("weatherTemp")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-3.5 border-t-2 border-dashed border-chart-3" />
        {t("weatherFeelsLike")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-chart-2" />
        {t("weatherRain")}
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-chart-1" />
        {t("statsWeatherArrivals")}
      </span>
      <span className="ml-auto flex gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("statsWeatherZoomOut")}
          // aria-disabled, not disabled, so focus stays on the button at the limit.
          aria-disabled={zoom === 0}
          onClick={() => onZoom(Math.max(zoom - 1, 0))}
        >
          <ZoomOut aria-hidden />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("statsWeatherZoomIn")}
          aria-disabled={zoom === maxZoom}
          onClick={() => onZoom(Math.min(zoom + 1, maxZoom))}
        >
          <ZoomIn aria-hidden />
        </Button>
      </span>
    </div>
  );
}
