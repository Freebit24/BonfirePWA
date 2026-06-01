// app/event/[id]/checkin/page.tsx
import { use } from 'react'
import CheckInClient from './checkin-client'
import { supabase } from '@/utils/supabase'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CheckInPageWrapper({ params }: PageProps) {
  // Use the 'use' hook to unwrap the Promise
  const { id } = use(params)
  
  return <CheckInClient eventId={id} />
}

export async function generateStaticParams() {
  const { data, error } = await supabase.from('events').select('id')

  if (error || !data) {
    console.error('Error generating static params for check-in page:', error)
    return []
  }

  return data.map((event) => ({
    id: event.id.toString(),
  }))
}