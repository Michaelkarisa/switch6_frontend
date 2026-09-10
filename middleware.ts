import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── Public routes (no auth required) ──────────────────────────
const PUBLIC = ['/', '/login', '/register', '/terms'];

// ── Admin-only route prefixes ─────────────────────────────────
const ADMIN_ONLY = ['/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let public routes through without any token check
  if (PUBLIC.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
     pathname.startsWith('/v1') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Read auth token from cookie (set by the frontend after login)
  // The actual validation happens server-side via Laravel; here we just
  // gate route access so unauthenticated users get redirected to /login
  // rather than seeing a flash of protected content.
  const token = request.cookies.get('switch6-token')?.value;
 console.log("Admin route access attempt. Token from cookie: ", token);
 
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }
  const role = request.cookies.get('switch6-role')?.value;
  // Admin route check: read role from cookie set at login
 console.log("Admin route access attempt. Role from cookie: ", role);
  if (ADMIN_ONLY.some(p => pathname.startsWith(p))) {
   // console.log("Admin route access attempt. Role from cookie: ", role);
    if (role !== 'admin' && role !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
