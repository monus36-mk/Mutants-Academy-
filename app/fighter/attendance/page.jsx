import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';
import { getFighterProfile } from '@/app/actions/fighterActions';
import { 
  getTodayAttendanceDashboard, 
  getFighterAttendanceHistory 
} from '@/app/actions/attendanceActions';
import FighterAttendanceClient from '@/components/FighterAttendanceClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Mat Attendance & Live Check-In | Mutants Academy',
  description: 'Punch in/out for daily combat training sessions, view live mat early-bird leaderboards, and inspect your monthly mat hours.',
};

export default async function FighterAttendancePage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'Fighter') {
    redirect('/login');
  }

  const [profileRes, dashRes, historyRes] = await Promise.all([
    getFighterProfile(user.id),
    getTodayAttendanceDashboard(user.id),
    getFighterAttendanceHistory(user.id),
  ]);

  if (!profileRes.success || !profileRes.fighter) {
    const { logout } = require('@/app/actions/authActions');
    await logout();
    redirect('/login');
  }

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  return (
    <FighterAttendanceClient
      fighter={profileRes.fighter}
      initialDashboard={dashRes.success ? dashRes : { myRecord: null, attendanceList: [], stats: {} }}
      initialHistory={historyRes.success ? historyRes : { history: [], stats: {} }}
      currentDateStr={todayStr}
    />
  );
}

