import { use } from 'react';
import InviteClient from './invite-client';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePageWrapper({ params }: PageProps) {
  const { token } = use(params);
  
  return <InviteClient token={token} />;
}
