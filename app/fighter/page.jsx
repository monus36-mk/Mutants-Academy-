import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFighterProfile, getPeers } from '@/app/actions/fighterActions';
import { getEvents } from '@/app/actions/eventActions';
import FighterDashboardClient from './FighterDashboardClient';

export default async function FighterDashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Fighter') {
    redirect('/login');
  }

  // Fetch initial dashboard data concurrently in parallel
  const [profileRes, peersRes, eventsRes] = await Promise.all([
    getFighterProfile(user.id),
    getPeers(user.id),
    getEvents(),
  ]);

  if (!profileRes.success) {
    // Session is invalid or fighter was deleted, log out
    const { logout } = require('@/app/actions/authActions');
    await logout();
    redirect('/login');
  }

  const peers = peersRes.success ? peersRes.fighters : [];
  const events = eventsRes.success ? eventsRes.events : [];

  return (
    <FighterDashboardClient
      fighter={profileRes.fighter}
      initialPeers={peers}
      initialEvents={events}
    />
  );
}
