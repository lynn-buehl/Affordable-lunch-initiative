import Link from "next/link";
import type { Participant } from "@/lib/db/queries/ali-events";
import { Avatar } from "@/components/ui/Avatar";

export function ParticipantList({ participants }: { participants: Participant[] }) {
  const optedIn = participants.filter((p) => p.optedIn);
  if (optedIn.length === 0) {
    return <p style={{ color: "var(--text-subtle)", fontSize: 14 }}>Nobody&apos;s opted in yet.</p>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {optedIn.map((p) => (
        <Link
          key={p.userId}
          href={`/members/${p.userId}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            padding: "3px 12px 3px 3px",
            borderRadius: 999,
            backgroundColor: "var(--bg-hover)",
            color: "var(--text-muted)",
            textDecoration: "none",
          }}
        >
          <Avatar name={p.name} size={24} />
          {p.name}
        </Link>
      ))}
    </div>
  );
}
