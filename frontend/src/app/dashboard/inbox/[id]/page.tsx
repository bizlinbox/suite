import Inbox from '@/components/Inbox';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  return <Inbox selectedId={id} />;
}
