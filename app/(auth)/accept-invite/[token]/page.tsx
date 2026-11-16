import { SetPasswordForm } from "@/components/account/SetPasswordForm";
import { acceptInviteAction } from "@/lib/auth/actions";

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <SetPasswordForm
      token={token}
      action={acceptInviteAction}
      submitLabel="Activate account"
      pendingLabel="Activating…"
    />
  );
}
