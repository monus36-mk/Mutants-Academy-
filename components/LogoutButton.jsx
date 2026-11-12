'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { performClientLogout } from '@/lib/clientAuth';

export default function LogoutButton({
  className = '',
  iconClassName = 'w-4 h-4',
  label = 'Log Out',
  showLabel = true,
  title = 'Logout Portal',
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleClick = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    performClientLogout();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoggingOut}
      className={className}
      title={title}
    >
      {isLoggingOut ? (
        <div className={`${iconClassName} border-2 border-current border-t-transparent rounded-full animate-spin shrink-0`} />
      ) : (
        <LogOut className={`${iconClassName} shrink-0`} />
      )}
      {showLabel && <span>{isLoggingOut ? 'Signing Out...' : label}</span>}
    </button>
  );
}

