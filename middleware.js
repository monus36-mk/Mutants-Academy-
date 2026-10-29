import { NextResponse } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(sessionCookie.value);
    if (!payload) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    // Role check: If logged in as Fighter, redirect to fighter dashboard without wiping session
    if (payload.role !== 'MainAdmin' && payload.role !== 'Coach') {
      return NextResponse.redirect(new URL('/fighter', request.url));
    }

    // Role check for users management (MainAdmin Only)
    if (pathname.startsWith('/admin/users') && payload.role !== 'MainAdmin') {
      const dashboardUrl = new URL('/admin', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Protect fighter routes
  if (pathname.startsWith('/fighter')) {
    const sessionCookie = request.cookies.get('session');
    
    if (!sessionCookie) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyToken(sessionCookie.value);
    if (!payload) {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('session');
      return response;
    }

    // Role check: If logged in as Admin or Coach, redirect to admin dashboard without wiping session
    if (payload.role !== 'Fighter') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // If already logged in and visits /login, redirect to their dashboard
  if (pathname === '/login') {
    const sessionCookie = request.cookies.get('session');
    if (sessionCookie) {
      const payload = await verifyToken(sessionCookie.value);
      if (payload) {
        if (payload.role === 'Fighter') {
          return NextResponse.redirect(new URL('/fighter', request.url));
        } else {
          return NextResponse.redirect(new URL('/admin', request.url));
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/fighter/:path*', '/login'],
};
