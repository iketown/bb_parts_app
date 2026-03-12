import { auth } from './firebase';
import type { User } from 'firebase/auth';

/**
 * Make an authenticated API request
 * Automatically adds Firebase ID token to Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  userOverride?: User | null
): Promise<Response> {
  const user = userOverride ?? auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  const idToken = await user.getIdToken();
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
