import { getCurrentUser } from '@/app/actions/authActions';
import { getCoaches } from '@/app/actions/coachActions';
import AddFighterForm from '@/components/AddFighterForm';
import { redirect } from 'next/navigation';

export default async function AddFighterPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  let coaches = [];
  if (user.role === 'MainAdmin') {
    const res = await getCoaches();
    if (res.success) {
      coaches = res.coaches;
    }
  }

  return (
    <div className="space-y-6">
      <AddFighterForm coaches={coaches} currentUser={user} />
    </div>
  );
}
