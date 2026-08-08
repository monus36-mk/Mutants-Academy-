import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/authActions';

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/admin');
  } else {
    redirect('/login');
  }
}
