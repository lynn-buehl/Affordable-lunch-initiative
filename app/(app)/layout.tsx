import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getUserById } from "@/lib/db/queries/users";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // The session cookie alone isn't proof: someone marked as "left" (or
  // demoted from admin) must lose access now, not when their cookie expires.
  const user = await getUserById(session.user.id);
  if (!user || user.status !== "active") redirect("/signed-out");

  return (
    <AppShell isAdmin={user.role === "admin"} user={{ id: user.id, name: user.name }}>
      {children}
    </AppShell>
  );
}
