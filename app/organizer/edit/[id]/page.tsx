import EditEventForm from './edit-client';

export default async function Page(props: { params: { id: string } }) {
  const { params } = await props;
  return <EditEventForm eventId={params.id} />;
}
