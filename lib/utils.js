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

// Parse stored phone string into countryCode and phone
export function parsePhone(phoneStr) {
  if (!phoneStr) return { countryCode: '+91', phone: '' };
  
  const trimmed = phoneStr.trim();
  
  // If it starts with + followed by digits
  if (trimmed.startsWith('+')) {
    // If there is a space, split by the first space. E.g. "+91 9876543210" -> cc: "+91", phone: "9876543210"
    const firstSpace = trimmed.indexOf(' ');
    if (firstSpace !== -1) {
      return {
        countryCode: trimmed.slice(0, firstSpace),
        phone: trimmed.slice(firstSpace + 1).trim()
      };
    }
    
    // If no space but starts with +91:
    if (trimmed.startsWith('+91')) {
      return {
        countryCode: '+91',
        phone: trimmed.slice(3).trim()
      };
    }
    
    // If it starts with +1:
    if (trimmed.startsWith('+1') && !trimmed.startsWith('+18') && !trimmed.startsWith('+19')) {
      return {
        countryCode: '+1',
        phone: trimmed.slice(2).trim()
      };
    }
    
    // Default fallback: split at index 3 (+XX)
    return {
      countryCode: trimmed.slice(0, 3),
      phone: trimmed.slice(3).trim()
    };
  }
  
  // If no +, check if it's a 10-digit number
  if (trimmed.length === 10) {
    return { countryCode: '+91', phone: trimmed };
  }
  
  // If it has 12 digits and starts with 91, it might be 919876543210
  if (trimmed.length === 12 && trimmed.startsWith('91')) {
    return { countryCode: '+91', phone: trimmed.slice(2) };
  }
  
  // Default fallback
  return { countryCode: '+91', phone: trimmed };
}

// Format phone number to clean string with country code default (91 for India)
export function formatWhatsAppNumber(phoneStr) {
  if (!phoneStr) return '';
  let clean = phoneStr.replace(/\D/g, '');
  // If it's a 10-digit number, default to Indian country code (91)
  if (clean.length === 10) {
    return '91' + clean;
  }
  return clean;
}

