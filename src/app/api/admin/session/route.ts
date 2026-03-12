import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authResult = await verifyAdminAuth(request);

  if (!authResult.isAuthenticated) {
    return NextResponse.json({ authorized: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (!authResult.isAuthorized) {
    return NextResponse.json({ authorized: false, error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    authorized: true,
    email: authResult.email,
    uid: authResult.uid,
  });
}
