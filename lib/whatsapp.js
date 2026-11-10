/**
 * WhatsApp Integration Service for Mutants Academy
 * Integrates directly with the local Baileys WA-HUB API engine.
 */

const DEFAULT_WA_API = 'http://localhost:5002/api';

/**
 * Normalizes any phone number format into a clean E.164-compatible Indian WhatsApp identifier (91xxxxxxxxxx).
 * Removes all non-numeric characters, spaces, hyphens, and standardizes 10-digit Indian numbers.
 *
 * @param {string|number} phone 
 * @returns {string} Clean numeric phone string with country code (e.g., '919876543210')
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  
  // If 10 digits (standard Indian mobile), prepend '91'
  if (clean.length === 10) {
    clean = '91' + clean;
  } else if (clean.length === 11 && clean.startsWith('0')) {
    // 0-prefixed Indian mobile (e.g., 09876543210)
    clean = '91' + clean.slice(1);
  } else if (clean.length === 12 && clean.startsWith('91')) {
    // Already in 919876543210 format
    return clean;
  } else if (clean.startsWith('0091')) {
    clean = clean.slice(2);
  }

  return clean;
}

/**
 * Dispatches a WhatsApp text message through the local WA-HUB / Baileys API.
 *
 * @param {string} phone - Recipient phone number
 * @param {string} message - WhatsApp text content (supports Markdown *bold*, _italic_, etc.)
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendWhatsAppMessage(phone, message) {
  try {
    const targetPhone = formatPhoneNumber(phone);
    if (!targetPhone || targetPhone.length < 10) {
      console.warn(`[WhatsApp API] Skipped message: invalid phone number "${phone}"`);
      return { success: false, error: 'Invalid phone number' };
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      return { success: false, error: 'Message content cannot be empty' };
    }

    const rawBaseUrl = process.env.WHATSAPP_API_URL || DEFAULT_WA_API;
    const apiUrl = rawBaseUrl.replace(/\/+$/, '');
    const sendEndpoint = `${apiUrl}/send`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second graceful timeout

    const res = await fetch(sendEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: targetPhone,
        message: message.trim(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[WhatsApp API Error ${res.status}] Failed to send to ${targetPhone}:`, errBody);
      return { 
        success: false, 
        error: `WhatsApp server responded with status ${res.status}: ${errBody || res.statusText}` 
      };
    }

    const data = await res.json();
    console.log(`[WhatsApp API] Message sent successfully to ${targetPhone}:`, data.messageId || 'OK');
    return { success: true, messageId: data.messageId || 'SENT', data };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`[WhatsApp API Timeout] Request to WA-HUB timed out for recipient ${phone}`);
      return { success: false, error: 'WhatsApp service request timed out' };
    }
    console.error(`[WhatsApp API Exception] Could not reach WhatsApp service:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Sends automated payment reminder alerts to fighters based on their renewal milestone.
 * Milestones:
 * - 3 days before expiry
 * - 1 day before expiry
 * - Expiring today (0 days)
 * - Expired (-3 days or overdue)
 *
 * @param {Object} params
 * @param {string} params.phone - Recipient phone number
 * @param {string} params.name - Athlete's full name
 * @param {Date|string} params.nextPaymentDate - Scheduled expiry date
 * @param {number} params.diffDays - Days remaining (+3, +1, 0, -3)
 * @param {string} params.payUrl - Direct renewal portal URL
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPaymentReminderWhatsApp({ phone, name, nextPaymentDate, diffDays, payUrl }) {
  const athleteName = name || 'Athlete';
  const renewalDateObj = new Date(nextPaymentDate);
  const formattedDate = isNaN(renewalDateObj.getTime())
    ? 'upcoming due date'
    : renewalDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

  let message = '';

  if (diffDays === 0) {
    // Expiring Today
    message = `🚨 *MUTANTS ACADEMY — MEMBERSHIP EXPIRES TODAY!* 🚨\n\n` +
      `Hey *${athleteName}*,\n\n` +
      `This is a critical reminder that your Mutants Academy training package expires *TODAY (${formattedDate})*.\n\n` +
      `To ensure uninterrupted entry to all daily training sessions and sparring slots, please renew your membership now:\n\n` +
      `⚡ *Instant One-Tap UPI Renewal:*\n` +
      `👉 ${payUrl}\n\n` +
      `Pay directly via Google Pay, PhonePe, or Paytm with instant activation.\n\n` +
      `_Train Hard. Stay Mutant._ 🥊\n` +
      `*Mutants Academy Admin Team*`;
  } else if (diffDays < 0) {
    // Expired (-3 days or overdue)
    const overdueDays = Math.abs(diffDays);
    const dayLabel = overdueDays === 1 ? 'day' : 'days';
    message = `🛑 *MUTANTS ACADEMY — PACKAGE EXPIRED* 🛑\n\n` +
      `Hey *${athleteName}*,\n\n` +
      `Your subscription package at Mutants Academy expired on *${formattedDate}* (*${overdueDays} ${dayLabel} ago*).\n\n` +
      `Your active athlete training status is currently on hold. We'd love to see you back on the mats with the team!\n\n` +
      `⚡ *Reactivate Your Subscription Now:*\n` +
      `👉 ${payUrl}\n\n` +
      `Choose your package (1, 3, 6, 12 Months) and renew securely via UPI.\n\n` +
      `_Train Hard. Stay Mutant._ 🥊\n` +
      `*Mutants Academy Admin Team*`;
  } else if (diffDays === 1) {
    // 1 Day Before
    message = `⚠️ *MUTANTS ACADEMY — EXPIRING TOMORROW* ⚠️\n\n` +
      `Hey *${athleteName}*,\n\n` +
      `A quick reminder that your Mutants Academy membership is set to expire *TOMORROW (${formattedDate})*.\n\n` +
      `Avoid any pause in your workout routines by renewing your package today:\n\n` +
      `⚡ *Renew Online in 30 Seconds:*\n` +
      `👉 ${payUrl}\n\n` +
      `If you have already paid at the gym counter, please notify your coach to update your records.\n\n` +
      `_Train Hard. Stay Mutant._ 🥊\n` +
      `*Mutants Academy Admin Team*`;
  } else {
    // 3 Days Before or standard upcoming
    message = `🥊 *MUTANTS ACADEMY — UPCOMING RENEWAL* 🥊\n\n` +
      `Hi *${athleteName}*,\n\n` +
      `Hope your training is going strong! Your Mutants Academy training package will be due for renewal in *${diffDays} days* (on *${formattedDate}*).\n\n` +
      `Keep your momentum going by locking in your spot for the next training cycle:\n\n` +
      `⚡ *Quick Renewal Portal:*\n` +
      `👉 ${payUrl}\n\n` +
      `_Train Hard. Stay Mutant._ 🥋\n` +
      `*Mutants Academy Admin Team*`;
  }

  return sendWhatsAppMessage(phone, message);
}

/**
 * Sends an official payment receipt on WhatsApp with status ACTIVE 🟢 and renewed date.
 *
 * @param {Object} params
 * @param {string} params.phone - Fighter's phone number
 * @param {string} params.name - Athlete name
 * @param {number|string} params.amount - Paid amount in INR
 * @param {number|string} params.durationMonths - Renewed package months
 * @param {Date|string} params.nextPaymentDate - New next payment due date
 * @param {string} [params.style] - Fighter style / discipline (MMA, Striking, Grappling)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPaymentSuccessWhatsApp({ phone, name, amount, durationMonths, nextPaymentDate, style }) {
  const athleteName = name || 'Athlete';
  const duration = Number(durationMonths) || 1;
  const renewalDateObj = new Date(nextPaymentDate);
  const formattedNextDate = isNaN(renewalDateObj.getTime())
    ? 'Active'
    : renewalDateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

  const formattedAmount = amount
    ? `₹${Number(amount).toLocaleString('en-IN')}`
    : 'Confirmed';

  const message = `🥋 *MUTANTS ACADEMY — OFFICIAL RENEWAL RECEIPT* 🥋\n\n` +
    `Dear *${athleteName}*,\n\n` +
    `Your training subscription has been successfully renewed and logged in the academy registry!\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *OFFICIAL RECEIPT DETAILS*\n` +
    `• *Status:* ACTIVE 🟢\n` +
    `• *Package Plan:* ${duration} Month${duration > 1 ? 's' : ''}\n` +
    `• *Discipline / Style:* ${style || 'MMA & Combat'}\n` +
    `• *Amount Paid:* ${formattedAmount}\n` +
    `• *Next Renewal Due:* ${formattedNextDate}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Your athlete portal access and session check-ins are fully active.\n` +
    `Thank you for being part of the Mutants family. See you on the mats!\n\n` +
    `_Train Hard. Stay Mutant._ 🥊\n` +
    `*Mutants Academy Administration*`;

  return sendWhatsAppMessage(phone, message);
}
