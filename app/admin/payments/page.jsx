import { getCurrentUser } from '@/app/actions/authActions';
import { getPayments } from '@/app/actions/paymentActions';
import PaymentsDashboardClient from '@/components/PaymentsDashboardClient';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Payment History & Ledger | Mutants Academy Admin',
  description: 'Complete billing records, UPI collections, and cash payment registry for Mutants Academy.',
};

export default async function AdminPaymentsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect('/login');
  }

  if (currentUser.role === 'Fighter') {
    redirect('/fighter');
  }

  const result = await getPayments({});
  const initialPayments = result.success ? result.payments : [];
  const fightersWithDues = result.success ? result.fightersWithDues || [] : [];
  const stats = result.success
    ? result.stats
    : {
        totalRevenue: 0,
        upiRevenue: 0,
        cashRevenue: 0,
        totalTransactions: 0,
        totalPendingBalance: 0,
        duesCount: 0,
      };

  return (
    <PaymentsDashboardClient
      initialPayments={initialPayments}
      fightersWithDues={fightersWithDues}
      stats={stats}
      currentUser={currentUser}
    />
  );
}
