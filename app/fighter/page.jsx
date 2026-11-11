import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFighterProfile, getPeers } from '@/app/actions/fighterActions';
import { getEvents } from '@/app/actions/eventActions';
import { getFighterPayments } from '@/app/actions/paymentActions';
import FighterDashboardClient from './FighterDashboardClient';

export default async function FighterDashboardPage({ searchParams }) {
  const sp = await searchParams;
  const initialTab = sp?.tab === 'directory' || sp?.tab === 'billing' ? sp.tab : 'events';
  const user = await getCurrentUser();
  if (!user || user.role !== 'Fighter') {
    redirect('/login');
  }

  // Fetch initial dashboard data concurrently in parallel
  const [profileRes, peersRes, eventsRes, paymentsRes] = await Promise.all([
    getFighterProfile(user.id),
    getPeers(user.id),
    getEvents(),
    getFighterPayments(user.id),
  ]);

  if (!profileRes.success) {
    if (profileRes.error === 'Fighter profile not found') {
      // Session is invalid or fighter was deleted, log out
      const { logout } = require('@/app/actions/authActions');
      await logout();
      redirect('/login');
    }
  }

  const peers = peersRes.success ? peersRes.fighters : [];
  const events = eventsRes.success ? eventsRes.events : [];
  const payments = paymentsRes.success ? paymentsRes.payments : [];

  return (
    <FighterDashboardClient
      key={initialTab}
      fighter={profileRes.fighter}
      initialPeers={peers}
      initialEvents={events}
      initialPayments={payments}
      initialTab={initialTab}
    />
  );
}
