import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    if (user.role === 'Fighter') {
      redirect('/fighter');
    } else {
      redirect('/admin');
    }
  } else {
    redirect('/login');
  }
}
