import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import type { TimelineMarker } from "../lib/timelineMarker";

// Building blocks shared by the timeline sections of the guest profile.

export function SectionTitle({
  as: Heading,
  children,
}: {
  as: "h2" | "h3";
  children: React.ReactNode;
}) {
  return (
    <Heading className="text-sm font-medium text-muted-foreground">
      {children}
    </Heading>
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-3" data-cy="section-loading">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function SectionError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="flex items-center justify-between gap-2 text-sm text-destructive"
      data-cy="section-error"
    >
      {message}
      <Button variant="ghost" size="sm" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}

export function Timeline({ children }: { children: React.ReactNode }) {
  return <ol className="ml-1.5 border-l border-border">{children}</ol>;
}

const MARKER_CLASS: Record<TimelineMarker, string> = {
  filled: "bg-foreground",
  hollow: "border-2 border-muted-foreground/60 bg-background",
  faint: "border-2 border-muted-foreground/30 bg-background",
  danger: "border-2 border-destructive bg-background",
};

export function TimelineItem({
  marker,
  "data-cy": dataCy,
  children,
}: {
  marker: TimelineMarker;
  "data-cy"?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-6 pb-4 last:pb-0" data-cy={dataCy}>
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1.5 size-2.5 -translate-x-[calc(50%-0.5px)] rounded-full",
          MARKER_CLASS[marker],
        )}
      />
      {children}
    </li>
  );
}
