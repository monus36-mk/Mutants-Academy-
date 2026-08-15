import { getCurrentUser } from '@/app/actions/authActions';
import { getEvents } from '@/app/actions/eventActions';
import { redirect } from 'next/navigation';
import EventsManager from './EventsManager';

export default async function AdminEventsPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
    redirect('/login');
  }

  const eventsRes = await getEvents();
  const events = eventsRes.success ? eventsRes.events : [];

  return (
    <div className="space-y-6">
      <EventsManager initialEvents={events} user={user} />
    </div>
  );
}
