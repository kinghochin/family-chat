import { AuthForm } from "@/components/auth-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="login" inviteToken={params.invite ?? ""} />;
}
