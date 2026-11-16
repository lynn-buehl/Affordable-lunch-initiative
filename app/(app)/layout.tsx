import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return <AppShell
      isAdmin={session.user.role === "admin"}
      user={{ id: session.user.id, name: session.user.name ?? "You" }}
    >{children}
    </AppShell>;
}
