import { getCurrentUser } from '@/app/actions/authActions';
import { getEvents } from '@/app/actions/eventActions';
import { redirect } from 'next/navigation';
import AdminNoticesClient from './AdminNoticesClient';

export default async function AdminNoticesPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'MainAdmin' && user.role !== 'Coach')) {
    redirect('/login');
  }

  const eventsRes = await getEvents();
  const events = eventsRes.success ? eventsRes.events : [];

  return (
    <div className="space-y-6">
      <AdminNoticesClient initialEvents={events} user={user} />
    </div>
  );
}
