import { AppShell } from "@/components/app-shell";

type ConversationPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { id } = await params;

  return <AppShell initialConversationId={id} />;
}
