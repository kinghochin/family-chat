import { AuthForm } from "@/components/auth-form";

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="signup" inviteToken={params.invite ?? ""} />;
}
