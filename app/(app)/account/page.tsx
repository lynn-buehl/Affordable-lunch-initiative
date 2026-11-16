import { requireUser } from "@/lib/auth/rbac";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";
import { ChangeEmailForm } from "@/components/account/ChangeEmailForm";
import { ProfileForm } from "@/components/account/ProfileForm";
import { PageHeader } from "@/components/layout/PageHeader";

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="animate-in">
      <PageHeader title="Account" subtitle={user.name} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
        }}
      >
        <ProfileForm currentTitle={user.title ?? ""} />
        <ChangePasswordForm />
        <ChangeEmailForm currentEmail={user.email} />
      </div>
    </div>
  );
}
