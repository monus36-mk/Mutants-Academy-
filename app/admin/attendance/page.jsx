import { getCurrentUser } from '@/app/actions/authActions';
import { getAdminAttendanceRoster } from '@/app/actions/attendanceActions';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import AttendanceDashboardClient from '@/components/AttendanceDashboardClient';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Attendance Roster & Mat Logs | Mutants Academy',
  description: 'Track daily attendance, early bird check-ins, and export monthly session records.',
};

export default async function AdminAttendancePage({ searchParams }) {
  const params = await searchParams;
  const userPayload = await getCurrentUser();
  if (!userPayload) {
    return redirect('/login');
  }

  if (userPayload.role === 'Fighter') {
    return redirect('/fighter/attendance');
  }

  await dbConnect();
  const dbUser = await User.findById(userPayload.id).lean();
  const user = dbUser
    ? {
        id: dbUser._id.toString(),
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role,
        category: dbUser.category,
      }
    : userPayload;

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const targetDate = params?.date || todayStr;

  const rosterRes = await getAdminAttendanceRoster(targetDate);
  const initialData = rosterRes.success ? rosterRes : { roster: [], stats: {} };

  return (
    <AttendanceDashboardClient
      initialData={initialData}
      initialDate={targetDate}
      currentUser={user}
    />
  );
}

