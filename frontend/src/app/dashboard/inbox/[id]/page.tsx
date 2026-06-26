import Inbox from '@/components/Inbox';

interface Props {
  params: { id: string };
}

export default function ConversationPage({ params }: Props) {
  return <Inbox selectedId={params.id} />;
}
