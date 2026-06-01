import EventDetailsClient from './event-details-client';
import { logger } from '@/lib/logger';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EventDetailsPageWrapper({ params }: PageProps) {
  const { id } = await params;

  logger.log('EVENT ID RECEIVED (PAGE):', id);

  return <EventDetailsClient eventId={id} />;
}
