import { ChatView } from "@/components/chat/ChatView";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string }>;
}) {
  // `?canal=` é como a notificação de menção traz a pessoa para a conversa
  // certa direto do sino.
  const { canal } = await searchParams;
  return <ChatView initialChannelId={canal} />;
}
