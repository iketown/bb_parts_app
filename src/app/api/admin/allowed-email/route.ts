import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin-emails';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ allowed: false, error: 'Email is required' }, { status: 400 });
    }

    const allowed = isAdminEmail(email);

    if (!allowed) {
      return NextResponse.json({ allowed: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('Allowed email check failed:', error);
    return NextResponse.json(
      { allowed: false, error: 'Failed to check email' },
      { status: 500 }
    );
  }
}

