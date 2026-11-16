import { listAliEvents } from "@/lib/db/queries/ali-events";
import { EventCard } from "@/components/ali/EventCard";
import { CreateEventDialog } from "@/components/ali/CreateEventDialog";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AliListPage() {
  const events = await listAliEvents();

  return (
    <div className="animate-in">
      <PageHeader
        title="ALI"
        subtitle="Shopping rounds — opt in, vote on ingredients, and see who's organizing"
        action={<CreateEventDialog />}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {events.length === 0 ? (
          <p style={{ color: "var(--text-subtle)" }}>
            No ALIs yet — start one with the button above.
          </p>
        ) : (
          events.map((event) => <EventCard key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}
