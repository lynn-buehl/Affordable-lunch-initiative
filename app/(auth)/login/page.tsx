import { LoginForm } from "@/components/account/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ activated?: string; reset?: string }>;
}) {
  const params = await searchParams;
  const notice = params.activated
    ? "Account activated. You can sign in now."
    : params.reset
      ? "Password reset. You can sign in with your new password."
      : undefined;

  return <LoginForm notice={notice} />;
}
