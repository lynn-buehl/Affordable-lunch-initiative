import { getActiveIngredients, getUserDefaultIngredientIds } from "@/lib/db/queries/ingredients";
import { requireUser } from "@/lib/auth/rbac";
import { IngredientList } from "@/components/ali/IngredientList";
import { AddIngredientForm } from "@/components/ali/AddIngredientForm";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function IngredientsPage() {
  const user = await requireUser();
  const [ingredients, defaultIds] = await Promise.all([
    getActiveIngredients(),
    getUserDefaultIngredientIds(user.id),
  ]);

  return (
    <div className="animate-in">
      <PageHeader
        title="Ingredients"
        subtitle="The shared pool everyone votes from. Star the ones you always want."
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <IngredientList ingredients={ingredients} defaultIds={[...defaultIds]} />
        <Card>
          <AddIngredientForm />
        </Card>
      </div>
    </div>
  );
}
