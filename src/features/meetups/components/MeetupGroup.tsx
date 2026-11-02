import { useId } from "react";
import type { components } from "@/api/types";
import { MeetupRow } from "./MeetupRow";

type Meetup = components["schemas"]["MeetupPublic"];

/** A titled list of meetups with its count; renders nothing when empty. */
export function MeetupGroup({
  title,
  meetups,
  "data-cy": dataCy,
}: {
  /** Left out for the one flat list of a picked sort. */
  title?: string;
  meetups: Meetup[];
  "data-cy"?: string;
}) {
  const headingId = useId();
  if (meetups.length === 0) return null;
  return (
    <section
      className="space-y-3"
      aria-labelledby={title ? headingId : undefined}
      data-cy={dataCy}
    >
      {title && (
        <h2
          id={headingId}
          className="text-sm font-medium text-muted-foreground"
        >
          {title} <span className="tabular-nums">({meetups.length})</span>
        </h2>
      )}
      <ul className="divide-y overflow-hidden rounded-xl border bg-card">
        {meetups.map((meetup) => (
          <MeetupRow key={meetup.id} meetup={meetup} />
        ))}
      </ul>
    </section>
  );
}
