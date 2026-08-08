// Helper to calculate status relative to today's date
export function calculateStatus(nextPaymentDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const paymentDate = new Date(nextPaymentDate);
  paymentDate.setHours(0, 0, 0, 0);

  const diffTime = paymentDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return 'Expired';
  } else if (diffDays <= 3) {
    return 'Due Soon';
  } else {
    return 'Active';
  }
}
