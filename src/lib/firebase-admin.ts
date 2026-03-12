// Firebase Admin SDK initialization for server-side operations
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function getServiceAccount(): ServiceAccount | null {
  const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    try {
      return JSON.parse(serviceAccountJson) as ServiceAccount;
    } catch (error) {
      console.error('Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON:', error);
    }
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

const serviceAccount = getServiceAccount();
export const hasFirebaseAdminCredentials = !!serviceAccount;

if (getApps().length === 0) {
  initializeApp(
    serviceAccount
      ? {
          credential: cert(serviceAccount),
          projectId: serviceAccount.projectId ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        }
      : {
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        }
  );
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage().bucket();
