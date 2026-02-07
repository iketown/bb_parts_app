// Admin authentication helpers for API routes
import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = 'admin-session';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

/**
 * Check if the current request has valid admin authentication
 * Used in API routes to protect admin operations
 */
export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const adminSession = cookieStore.get(ADMIN_COOKIE_NAME);
  return adminSession?.value === 'authenticated';
}

/**
 * Validate admin password
 */
export function validateAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}
