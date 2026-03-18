import { AuthCallbackClient } from "@/components/auth-callback-client";

export const dynamic = "force-dynamic";

type AuthCallbackPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AuthCallbackPage({ searchParams }: AuthCallbackPageProps) {
  const params = await searchParams;

  return <AuthCallbackClient error={params.error} />;
}
