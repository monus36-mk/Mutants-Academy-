import { getCurrentUser } from '@/app/actions/authActions';
import { getCoaches } from '@/app/actions/coachActions';
import EditFighterForm from '@/components/EditFighterForm';
import dbConnect from '@/lib/db';
import Fighter from '@/models/Fighter';
import { redirect } from 'next/navigation';

export default async function EditFighterPage({ params }) {
  // Await page params in Next.js 15
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  await dbConnect();
  const fighter = await Fighter.findById(id).lean();
  
  if (!fighter) {
    redirect('/admin');
  }

  // Permission check: Coaches can only edit their own fighters
  if (user.role === 'Coach' && fighter.assignedCoach.toString() !== user.id) {
    redirect('/admin');
  }

  // Serialize MongoDB object for Client Component
  const serializedFighter = {
    ...fighter,
    _id: fighter._id.toString(),
    assignedCoach: fighter.assignedCoach ? fighter.assignedCoach.toString() : null,
    entryDate: fighter.entryDate ? fighter.entryDate.toISOString() : null,
    joiningDate: fighter.joiningDate ? fighter.joiningDate.toISOString() : (fighter.entryDate ? fighter.entryDate.toISOString() : null),
    email: fighter.email || '',
    dob: fighter.dob ? fighter.dob.toISOString() : null,
    nextPaymentDate: fighter.nextPaymentDate ? fighter.nextPaymentDate.toISOString() : null,
  };

  let coaches = [];
  if (user.role === 'MainAdmin') {
    const coachRes = await getCoaches();
    if (coachRes.success) {
      coaches = coachRes.coaches;
    }
  }

  return (
    <div className="space-y-6">
      <EditFighterForm 
        fighter={serializedFighter} 
        coaches={coaches} 
        currentUser={user} 
      />
    </div>
  );
}
