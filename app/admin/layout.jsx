import { getCurrentUser } from '@/app/actions/authActions';
import { redirect } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role === 'Fighter') {
    redirect('/fighter');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 transition-colors duration-200 flex flex-col">
      <AdminHeader user={user} />
      <main className="flex-1 w-full max-w-7xl xl:max-w-[1440px] 2xl:max-w-[1720px] 3xl:max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 md:py-8">
        {children}
      </main>
      <footer className="border-t border-slate-200 dark:border-zinc-900 bg-white dark:bg-zinc-950 py-6 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors duration-200">
        &copy; 2026 Mutants Academy MMA Gym. All rights reserved.
      </footer>
    </div>
  );
}
