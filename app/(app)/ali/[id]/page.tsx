import { notFound } from "next/navigation";
import { auth } from "@/lib/auth/config";
import {
  getAliEvent,
  getParticipants,
  getParticipation,
  getVotesForUser,
  getShoppingList,
} from "@/lib/db/queries/ali-events";
import { getActiveIngredients } from "@/lib/db/queries/ingredients";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { ParticipationToggle } from "@/components/ali/ParticipationToggle";
import { IngredientVoteList } from "@/components/ali/IngredientVoteList";
import { AddIngredientToEventForm } from "@/components/ali/AddIngredientToEventForm";
import { ParticipantList } from "@/components/ali/ParticipantList";
import { OrganizerControls } from "@/components/ali/OrganizerControls";
import { ShoppingChecklist } from "@/components/ali/ShoppingChecklist";
import { ReceiptScanner } from "@/components/receipts/ReceiptScanner";
import { ReceiptList } from "@/components/receipts/ReceiptList";
import { getReceiptsForEvent } from "@/lib/db/queries/receipts";
import { isReceiptScanningConfigured } from "@/lib/receipts/extract";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

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

export default async function AliEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) notFound();

  const event = await getAliEvent(id);
  if (!event) notFound();

  const [participants, optedIn, ingredients, votes] = await Promise.all([
    getParticipants(id),
    getParticipation(id, session.user.id),
    getActiveIngredients(),
    getVotesForUser(id, session.user.id),
  ]);

  const isOrganizerOrAdmin = session.user.role === "admin" || event.organizerId === session.user.id;
  const showShoppingList = event.status === "shopping" || event.status === "completed";
  const [shoppingList, receipts] = await Promise.all([
    // During voting this is a live preview of what everyone has asked for.
    event.status === "cancelled" ? [] : getShoppingList(id),
    showShoppingList ? getReceiptsForEvent(id) : [],
  ]);
  const manualEntryHref = `/finance/entry?aliEventId=${id}&description=${encodeURIComponent(event.name)}`;

  return (
    <div className="animate-in">
      <PageHeader
        title={event.name}
        subtitle={`${event.type} · organized by ${event.organizerName}`}
        action={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Badge kind={STATUS_KIND[event.status]}>{STATUS_LABEL[event.status]}</Badge>
            {isOrganizerOrAdmin ? (
              <OrganizerControls eventId={id} status={event.status} />
            ) : null}
          </div>
        }
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {event.status === "voting" ? (
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <h2 style={{ fontSize: 16 }}>Vote for ingredients</h2>
              <ParticipationToggle eventId={id} optedIn={optedIn} />
            </div>
            {optedIn ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <IngredientVoteList
                  eventId={id}
                  ingredients={ingredients}
                  votes={Object.fromEntries(votes)}
                />
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <AddIngredientToEventForm eventId={id} />
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--text-subtle)", fontSize: 14 }}>
                Opt in to vote for what you want.
              </p>
            )}
          </Card>
        ) : null}

        {showShoppingList ? (
          <Card>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>Shopping list</h2>
            <ShoppingChecklist
              eventId={id}
              items={shoppingList}
              readOnly={event.status !== "shopping"}
            />
          </Card>
        ) : null}

        {event.status === "voting" ? (
          <Card>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>The list so far</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-subtle)" }}>
              What everyone has asked for, rounded up to packs. It keeps changing until the
              organizer starts shopping.
            </p>
            <ShoppingChecklist eventId={id} items={shoppingList} readOnly />
          </Card>
        ) : null}

        {event.status === "shopping" ? (
          <Card>
            <h2 style={{ fontSize: 16, marginBottom: 4 }}>Paid? Scan the receipt</h2>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-subtle)" }}>
              The total is logged as your expense and every item is recorded.
            </p>
            {isReceiptScanningConfigured() ? (
              <ReceiptScanner
                aliEventId={id}
                defaultDescription={event.name}
                ingredients={ingredients.map((i) => ({ id: i.id, name: i.name }))}
                canComplete={isOrganizerOrAdmin}
              />
            ) : (
              <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)" }}>
                Receipt scanning isn&apos;t switched on for this site yet.
              </p>
            )}
            <p style={{ margin: "14px 0 0", fontSize: 13 }}>
              <Link href={manualEntryHref}>Or type the amount in by hand</Link>
            </p>
          </Card>
        ) : null}

        {receipts.length > 0 ? (
          <Card>
            <h2 style={{ fontSize: 16, marginBottom: 16 }}>What was bought</h2>
            <ReceiptList receipts={receipts} />
          </Card>
        ) : event.status === "completed" ? (
          <Card>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-muted)" }}>
              No receipt was scanned for this ALI.
            </p>
            <Link href={manualEntryHref}>
              <Button variant="secondary" size="sm">
                Log this expense
              </Button>
            </Link>
          </Card>
        ) : null}

        <Card>
          <h2 style={{ fontSize: 16, marginBottom: 16 }}>Who&apos;s in</h2>
          <ParticipantList participants={participants} />
        </Card>
      </div>
    </div>
  );
}
