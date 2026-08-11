import { AcceptInvite } from "@/components/workspace/AcceptInvite";

export default async function ConvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <AcceptInvite token={token} />;
}
