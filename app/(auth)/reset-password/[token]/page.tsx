import { SetPasswordForm } from "@/components/account/SetPasswordForm";
import { resetPasswordAction } from "@/lib/auth/actions";

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <SetPasswordForm
      token={token}
      action={resetPasswordAction}
      submitLabel="Reset password"
      pendingLabel="Resetting…"
    />
  );
}
