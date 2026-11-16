import Link from "next/link";
import { notFound } from "next/navigation";
import { Settings, ShoppingBag, Utensils, PiggyBank, Sparkles, Trophy, Scale, Soup } from "lucide-react";
import { z } from "zod";
import { auth } from "@/lib/auth/config";
import { getMemberProfile } from "@/lib/db/queries/profile";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatGrid, StatTile } from "@/components/ui/StatTile";
import { RankedBars } from "@/components/ui/RankedBars";
import { KarmaHistory } from "@/components/profile/KarmaHistory";
import { formatCents, formatKarma } from "@/lib/money";
import styles from "@/components/profile/Profile.module.css";

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

function karmaMood(cents: number): string {
  if (cents >= 5000) return "Carrying the group";
  if (cents > 0) return "Gives more than they eat";
  if (cents === 0) return "Perfectly balanced";
  if (cents > -5000) return "Eats a little more than they buy";
  return "Due for a shopping trip";
}

const ACTIVITY_ICON = {
  expense: ShoppingBag,
  contribution: PiggyBank,
  meal: Utensils,
} as const;

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [session, profile] = await Promise.all([auth(), getMemberProfile(id)]);
  if (!profile) notFound();

  const { summary } = profile;
  const isMe = session?.user?.id === id;
  const tone = (cents: number) => (cents > 0 ? "positive" : cents < 0 ? "negative" : "neutral");

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className={`${styles.hero} aurora`}>
        <Avatar name={summary.name} size={84} />
        <div className={styles.heroText}>
          <h1 className={styles.name}>{summary.name}</h1>
          <p className={styles.meta}>
            {summary.role === "admin" ? <Badge kind="accent">Admin</Badge> : null}
            {profile.title ? (
              <>
                <span>{profile.title}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <span>Member since {monthFormatter.format(profile.memberSince)}</span>
            <span aria-hidden="true">·</span>
            <span>{karmaMood(summary.karmaCents)}</span>
          </p>
        </div>
        {isMe ? (
          <Link href="/account">
            <Button variant="secondary" size="sm">
              <Settings size={15} /> Account settings
            </Button>
          </Link>
        ) : null}
      </div>

      <StatGrid>
        <StatTile
          label="ALI karma"
          icon={<Sparkles size={13} />}
          value={formatKarma(summary.karmaCents)}
          tone={tone(summary.karmaCents)}
          hint="Spent minus eaten"
        />
        <StatTile
          label="Karma rank"
          icon={<Trophy size={13} />}
          value={`#${summary.karmaRank}`}
          hint={`of ${profile.memberCount} members`}
        />
        <StatTile
          label="Balance"
          icon={<Scale size={13} />}
          value={formatCents(summary.balanceCents)}
          tone={tone(summary.balanceCents)}
          hint={summary.balanceCents < 0 ? "Time to go shopping" : "In the clear"}
        />
        <StatTile
          label="ALIs joined"
          icon={<Soup size={13} />}
          value={summary.mealsJoined}
          hint={`${summary.shoppingTrips} shopping ${summary.shoppingTrips === 1 ? "trip" : "trips"} · ${formatCents(profile.totalSpentCents)} spent`}
        />
      </StatGrid>

      <div className={styles.columns}>
        <Card>
          <h2 className={styles.sectionTitle}>Favourite ingredients</h2>
          <p className={styles.sectionHint}>What {isMe ? "you ask" : `${summary.name} asks`} for most, across every ALI</p>
          <RankedBars
            unit="×"
            items={profile.favourites.map((f) => ({ id: f.ingredientId, label: f.name, value: f.total }))}
            emptyText="No votes yet. Favourites show up after the first ALI vote."
          />
          {profile.defaults.length > 0 ? (
            <div style={{ marginTop: 22 }}>
              <p className={styles.sectionHint} style={{ marginBottom: 10 }}>
                Always on the list (standing order)
              </p>
              <div className={styles.chips}>
                {profile.defaults.map((name) => (
                  <span key={name} className={styles.chip}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {isMe ? (
            <p style={{ margin: "18px 0 0", fontSize: 13 }}>
              <Link href="/ingredients">Edit your standing order</Link>
            </p>
          ) : null}
        </Card>

        <Card>
          <h2 className={styles.sectionTitle}>Recent activity</h2>
          <p className={styles.sectionHint}>Shopping, contributions and ALIs joined</p>
          {profile.activity.length === 0 ? (
            <p style={{ margin: 0, color: "var(--text-subtle)", fontSize: 14 }}>Nothing yet.</p>
          ) : (
            <ul className={styles.activity}>
              {profile.activity.map((item) => {
                const Icon = ACTIVITY_ICON[item.kind];
                return (
                  <li key={item.id} className={styles.activityRow}>
                    <span className={styles.activityIcon}>
                      <Icon size={15} />
                    </span>
                    <span className={styles.activityLabel}>
                      {item.kind === "meal" ? "Joined " : ""}
                      {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}
                    </span>
                    {item.amountCents !== null ? (
                      <span className={styles.activityAmount}>{formatCents(item.amountCents)}</span>
                    ) : null}
                    <span className={styles.activityDate}>{dayFormatter.format(item.date)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {profile.bought.length > 0 ? (
        <Card>
          <h2 className={styles.sectionTitle}>Carried home</h2>
          <p className={styles.sectionHint}>Ingredients on {isMe ? "your" : "their"} scanned receipts</p>
          <RankedBars
            unit="×"
            items={profile.bought.map((b) => ({ id: b.name, label: b.name, value: b.quantity }))}
            emptyText=""
          />
        </Card>
      ) : null}

      <Card>
        <h2 className={styles.sectionTitle}>Karma by week</h2>
        <p className={styles.sectionHint}>
          Money spent on the group counts up; each ALI eaten counts down by that week&rsquo;s price per meal
        </p>
        <KarmaHistory weeks={profile.karma.weeks} />
      </Card>
    </div>
  );
}
