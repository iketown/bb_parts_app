// API client utilities with authentication
import { auth } from './firebase';

/**
 * Make an authenticated API request
 * Automatically adds Firebase ID token to Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Get the ID token
  const idToken = await user.getIdToken();

  // Add Authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}
