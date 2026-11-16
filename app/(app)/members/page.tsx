import Link from "next/link";
import { auth } from "@/lib/auth/config";
import { getMemberSummaries } from "@/lib/db/queries/profile";
import { getAllUsers } from "@/lib/db/queries/users";
import { AddMemberDialog } from "@/components/admin/AddMemberDialog";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { formatKarma } from "@/lib/money";
import styles from "@/components/profile/Profile.module.css";

export default async function MembersPage() {
  const [session, members] = await Promise.all([auth(), getMemberSummaries()]);
  const isAdmin = session?.user?.role === "admin";
  // Includes invited-but-not-yet-active people, so they aren't suggested twice.
  const existingNames = isAdmin ? (await getAllUsers()).map((u) => u.name) : [];

  return (
    <div className="animate-in">
      <PageHeader
        title="Members"
        subtitle="Everyone in the group, ranked by karma. Pick someone to see their profile."
        action={
          isAdmin ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Link href="/admin/members">
                <Button variant="secondary">Manage</Button>
              </Link>
              <AddMemberDialog existingNames={existingNames} />
            </div>
          ) : null
        }
      />
      <div className={styles.directory}>
        {members.map((member) => (
          <Link key={member.userId} href={`/members/${member.userId}`} className={styles.memberLink}>
            <Card interactive className={styles.memberCard}>
              <div className={styles.memberTop}>
                <Avatar name={member.name} size={44} />
                <div style={{ minWidth: 0 }}>
                  <p className={styles.memberName}>{member.name}</p>
                  <p className={styles.memberSub}>
                    {member.topIngredient ? `Loves ${member.topIngredient}` : "No votes yet"}
                  </p>
                </div>
              </div>
              <div className={styles.memberStats}>
                <span className={styles.memberStat}>
                  Karma
                  <strong
                    className={
                      member.karmaCents > 0
                        ? styles.karmaPositive
                        : member.karmaCents < 0
                          ? styles.karmaNegative
                          : undefined
                    }
                  >
                    {formatKarma(member.karmaCents)}
                  </strong>
                </span>
                <span className={styles.memberStat}>
                  Rank
                  <strong>#{member.karmaRank}</strong>
                </span>
                <span className={styles.memberStat}>
                  ALIs
                  <strong>{member.mealsJoined}</strong>
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
