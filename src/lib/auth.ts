// Admin authentication helpers for API routes
import { adminAuth } from './firebase-admin';
import { NextRequest } from 'next/server';

/**
 * Check if the current request has valid Firebase authentication
 * Expects Authorization header with Bearer token (Firebase ID token)
 * Used in API routes to protect admin operations
 */
export async function checkAdminAuth(request?: NextRequest): Promise<boolean> {
  try {
    // If no request provided, try to get it from headers (for backwards compatibility)
    if (!request) {
      return false;
    }

    const authHeader = request.headers.get('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const idToken = authHeader.split('Bearer ')[1];

    if (!idToken) {
      return false;
    }

    // Verify the ID token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Successfully verified - user is authenticated
    return !!decodedToken.uid;
  } catch (error) {
    console.error('Auth verification error:', error);
    return false;
  }
}
