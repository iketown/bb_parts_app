import { adminAuth } from './firebase-admin';
import { isAdminEmail } from './admin-emails';
import { NextRequest, NextResponse } from 'next/server';

type AdminAuthResult = {
  email: string | null;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  uid: string | null;
};

/**
 * Check if the current request has valid Firebase authentication
 * Expects Authorization header with Bearer token (Firebase ID token)
 * Used in API routes to protect admin operations
 */
export async function verifyAdminAuth(request?: NextRequest): Promise<AdminAuthResult> {
  const unauthorizedResult: AdminAuthResult = {
    email: null,
    isAuthenticated: false,
    isAuthorized: false,
    uid: null,
  };

  try {
    if (!request) {
      return unauthorizedResult;
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResult;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return unauthorizedResult;
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const email = decodedToken.email?.toLowerCase() ?? null;

    return {
      email,
      isAuthenticated: !!decodedToken.uid,
      isAuthorized: !!decodedToken.uid && isAdminEmail(email),
      uid: decodedToken.uid ?? null,
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return unauthorizedResult;
  }
}

export async function checkAdminAuth(request?: NextRequest): Promise<boolean> {
  const authResult = await verifyAdminAuth(request);
  return authResult.isAuthorized;
}

export function createAdminAuthErrorResponse(authResult: AdminAuthResult) {
  const status = authResult.isAuthenticated ? 403 : 401;
  const error = status === 403 ? 'Forbidden' : 'Unauthorized';

  return NextResponse.json({ error }, { status });
}
