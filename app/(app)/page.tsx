import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart, Vote, Plus, Sparkles, Trophy, Scale, Soup } from "lucide-react";
import { auth } from "@/lib/auth/config";
import { getCurrentAliEvent, getParticipation } from "@/lib/db/queries/ali-events";
import { getGroupFavourites, getMemberSummaries } from "@/lib/db/queries/profile";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { StatGrid, StatTile } from "@/components/ui/StatTile";
import { RankedBars } from "@/components/ui/RankedBars";
import { formatCents, formatKarma } from "@/lib/money";
import styles from "@/components/home/Home.module.css";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [members, favourites, current] = await Promise.all([
    getMemberSummaries(),
    getGroupFavourites(),
    getCurrentAliEvent(),
  ]);
  const me = members.find((m) => m.userId === userId);
  const optedIn = current ? await getParticipation(current.id, userId) : null;
  const firstName = (session.user.name ?? "there").split(" ")[0];
  const tone = (cents: number) => (cents > 0 ? "positive" : cents < 0 ? "negative" : "neutral");

  let kicker = "Nothing planned";
  let lede = "No ALI is open right now. Start one and everyone can vote for what they want.";
  let action = (
    <Link href="/ali">
      <Button>
        <Plus size={16} /> Plan an ALI
      </Button>
    </Link>
  );
  if (current?.status === "voting") {
    kicker = "Voting is open";
    lede =
      optedIn === true
        ? `You're in for ${current.name}, along with ${current.participantCount - 1} other${current.participantCount === 2 ? "" : "s"}. Check your ingredients before ${current.organizerName} goes shopping.`
        : `${current.organizerName} is planning ${current.name}. Opt in and vote for what you want.`;
    action = (
      <Link href={`/ali/${current.id}`}>
        <Button>
          <Vote size={16} /> {optedIn === true ? "Review my vote" : "Join and vote"}
        </Button>
      </Link>
    );
  } else if (current?.status === "shopping") {
    kicker = "Shopping in progress";
    lede = `The list for ${current.name} is locked in for ${current.participantCount} ${current.participantCount === 1 ? "person" : "people"}. Open it to tick things off and scan the receipt at the end.`;
    action = (
      <Link href={`/ali/${current.id}`}>
        <Button>
          <ShoppingCart size={16} /> Open shopping list
        </Button>
      </Link>
    );
  }

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <section className={`${styles.hero} aurora`}>
        <div>
          <p className={styles.kicker}>{kicker}</p>
          <h1 className={styles.title}>Hi {firstName}</h1>
          <p className={styles.lede}>{lede}</p>
        </div>
        <div className={styles.heroActions}>{action}</div>
      </section>

      {me ? (
        <StatGrid>
          <StatTile
            label="Your karma"
            icon={<Sparkles size={13} />}
            value={formatKarma(me.karmaCents)}
            tone={tone(me.karmaCents)}
            hint="Spent minus eaten"
          />
          <StatTile
            label="Karma rank"
            icon={<Trophy size={13} />}
            value={`#${me.karmaRank}`}
            hint={`of ${members.length} members`}
          />
          <StatTile
            label="Your balance"
            icon={<Scale size={13} />}
            value={formatCents(me.balanceCents)}
            tone={tone(me.balanceCents)}
            hint={me.balanceCents < 0 ? "Time to go shopping" : "In the clear"}
          />
          <StatTile
            label="ALIs joined"
            icon={<Soup size={13} />}
            value={me.mealsJoined}
            hint={me.topIngredient ? `Your favourite: ${me.topIngredient}` : "No votes yet"}
          />
        </StatGrid>
      ) : null}

      <div className={styles.columns}>
        <Card>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>What the group wants</h2>
            <Link href="/stats" className={styles.sectionLink}>
              All stats
            </Link>
          </div>
          <p className={styles.sectionHint}>Most requested ingredients, last 90 days</p>
          <RankedBars
            unit="×"
            items={favourites.map((f) => ({
              id: f.ingredientId,
              label: f.name,
              value: f.total,
              note: `${f.fans} ${f.fans === 1 ? "fan" : "fans"}`,
            }))}
            emptyText="No votes in the last 90 days yet."
          />
        </Card>

        <Card>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Karma table</h2>
            <Link href="/members" className={styles.sectionLink}>
              All members
            </Link>
          </div>
          <p className={styles.sectionHint}>Who has given the group the most</p>
          <ol className={styles.board}>
            {members.slice(0, 6).map((member) => (
              <li key={member.userId} className={styles.boardRow}>
                <Link href={`/members/${member.userId}`} className={styles.boardLink}>
                  <span className={styles.boardRank}>{member.karmaRank}</span>
                  <Avatar name={member.name} size={28} />
                  <span className={styles.boardName}>
                    {member.name}
                    {member.userId === userId ? <span className={styles.boardMe}> (you)</span> : null}
                  </span>
                  <span
                    className={`${styles.boardValue} ${
                      member.karmaCents > 0 ? styles.positive : member.karmaCents < 0 ? styles.negative : ""
                    }`}
                  >
                    {formatKarma(member.karmaCents)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
