import { use } from 'react';
import EventDetailsClient from './event-details-client';
import { supabase } from '@/utils/supabase';

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EventDetailsPageWrapper({ params }: PageProps) {
  // Use the 'use' hook to unwrap the Promise
  const { id } = use(params);
  
  return <EventDetailsClient eventId={id} />;
}

export async function generateStaticParams() {
  const { data, error } = await supabase.from('events').select('id');

  if (error || !data) {
    console.error('Error fetching event IDs:', error);
    return [];
  }

  return data.map((event) => ({
    id: event.id.toString(), // 🔥 Must be string
  }));
}