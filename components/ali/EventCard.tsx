import Link from "next/link";
import { Users, ChefHat } from "lucide-react";
import type { AliEventWithOrganizer } from "@/lib/db/queries/ali-events";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import styles from "./EventCard.module.css";

const STATUS_LABEL: Record<string, string> = {
  voting: "Voting open",
  shopping: "Shopping",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_KIND: Record<string, "accent" | "positive" | "neutral" | "negative"> = {
  voting: "accent",
  shopping: "positive",
  completed: "neutral",
  cancelled: "negative",
};

export function EventCard({ event }: { event: AliEventWithOrganizer }) {
  return (
    <Link href={`/ali/${event.id}`} className={styles.link}>
      <Card interactive className={styles.card}>
        <div>
          <p className={styles.name}>{event.name}</p>
          <div className={styles.meta}>
            <ChefHat size={14} />
            {event.type} · organized by {event.organizerName}
          </div>
        </div>
        <div className={styles.right}>
          <Badge kind={STATUS_KIND[event.status]}>{STATUS_LABEL[event.status]}</Badge>
          <span className={styles.participants}>
            <Users size={14} />
            {event.participantCount}
          </span>
        </div>
      </Card>
    </Link>
  );
}
