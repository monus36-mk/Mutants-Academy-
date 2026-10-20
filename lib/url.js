import { headers } from 'next/headers';

/**
 * Dynamically resolves the base application URL for email links, redirects, and notifications.
 *
 * Priority order:
 * 1. Explicit NEXT_PUBLIC_APP_URL or APP_URL (if configured and not localhost)
 * 2. Active HTTP request headers ('origin', 'x-forwarded-host', 'host') - automatically matches the live domain
 * 3. Vercel deployment variables (VERCEL_PROJECT_PRODUCTION_URL, VERCEL_URL, VERCEL_BRANCH_URL)
 * 4. Active request header if running on localhost (local dev)
 * 5. Explicit NEXT_PUBLIC_APP_URL or APP_URL (even if localhost)
 * 6. Fallback default: 'http://localhost:3000'
 */
export async function getBaseUrl(fallbackUrl = null) {
  if (fallbackUrl && typeof fallbackUrl === 'string' && fallbackUrl.trim()) {
    const cleaned = fallbackUrl.trim().replace(/\/+$/, '');
    return cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
  }

  // 1. Explicit non-localhost environment variable
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.trim() !== '') {
    const cleaned = envUrl.trim().replace(/\/+$/, '');
    if (!cleaned.includes('localhost') && !cleaned.includes('127.0.0.1')) {
      return cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
    }
  }

  // 2. Dynamic detection from incoming request headers
  let localRequestUrl = null;
  try {
    const headerList = await headers();
    const origin = headerList.get('origin');
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin.replace(/\/+$/, '');
    }

    const forwardedHost = headerList.get('x-forwarded-host');
    const host = forwardedHost || headerList.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = headerList.get('x-forwarded-proto') || 'https';
      return `${proto}://${host}`.replace(/\/+$/, '');
    }

    if (origin) {
      localRequestUrl = origin.replace(/\/+$/, '');
    } else if (host) {
      const proto = headerList.get('x-forwarded-proto') || 'http';
      localRequestUrl = `${proto}://${host}`.replace(/\/+$/, '');
    }
  } catch (e) {
    // headers() might not be available outside request context (e.g. background job)
  }

  // 3. Automatic Vercel platform environment variables
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL.replace(/\/+$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/+$/, '')}`;
  }

  // 4. Request header if running locally
  if (localRequestUrl) {
    return localRequestUrl;
  }

  // 5. Environment variable if explicitly set to localhost
  if (envUrl && envUrl.trim() !== '') {
    const cleaned = envUrl.trim().replace(/\/+$/, '');
    return cleaned.startsWith('http') ? cleaned : `http://${cleaned}`;
  }

  // 6. Absolute fallback
  return 'http://localhost:3000';
}
