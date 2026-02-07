// Middleware - minimal for Next.js
// Auth is handled client-side in admin layout
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
