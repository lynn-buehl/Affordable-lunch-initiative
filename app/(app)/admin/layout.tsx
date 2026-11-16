import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { getUserById } from "@/lib/db/queries/users";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read the role from the database, not the session cookie, so a demoted
  // admin loses these pages (which list everyone's email) immediately.
  const session = await auth();
  const user = session?.user ? await getUserById(session.user.id) : undefined;
  if (user?.role !== "admin" || user.status !== "active") redirect("/");

  return <>{children}</>;
}
