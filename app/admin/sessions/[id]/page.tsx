import SessionDetailView from '@/components/Sessions/SessionDetailView';

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SessionDetailView sessionId={id} />;
}
