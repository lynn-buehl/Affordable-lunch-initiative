import { getKarmaByUser, getTrendingIngredients } from "@/lib/db/queries/karma";
import { KarmaSection } from "@/components/stats/KarmaSection";
import { SequentialBarChart } from "@/components/stats/SequentialBarChart";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function StatsPage() {
  const [karma, trending] = await Promise.all([
    getKarmaByUser(),
    getTrendingIngredients(),
  ]);

  return (
    <div className="animate-in" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <PageHeader
        title="Stats"
        subtitle="Karma: spending money is +, consuming a meal is − that week's price per meal"
      />

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 20 }}>Karma</h2>
        <KarmaSection people={karma} />
      </Card>

      <Card>
        <h2 style={{ fontSize: 16, marginBottom: 4 }}>Trending ingredients</h2>
        <p style={{ fontSize: 13, color: "var(--text-subtle)", marginBottom: 20 }}>
          Fancy ALI votes, last 90 days
        </p>
        <SequentialBarChart
          data={trending.map((t) => ({ id: t.name, label: t.name, value: t.votes }))}
        />
      </Card>
    </div>
  );
}
