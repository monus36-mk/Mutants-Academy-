import { NextResponse } from 'next/server';

function applyLogoutCookies(response) {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set('session', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    expires: new Date(0),
  });
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  return response;
}

export async function GET(request) {
  const loginUrl = new URL('/login?loggedOut=1', request.url);
  const response = NextResponse.redirect(loginUrl, { status: 303 });
  return applyLogoutCookies(response);
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  return applyLogoutCookies(response);
}

