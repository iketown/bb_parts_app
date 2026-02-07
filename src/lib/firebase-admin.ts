// Firebase Admin SDK initialization for server-side operations
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK (singleton pattern)
if (getApps().length === 0) {
  // For local development and Vercel, use project ID for basic auth
  // This works for auth verification without a service account
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

export const adminAuth = getAuth();
