'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { authenticatedFetch } from '@/lib/api-client';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);

          if (pathname !== '/admin/login') {
            router.replace('/admin/login');
          }
        }

        return;
      }

      try {
        const response = await authenticatedFetch(
          '/api/admin/session',
          { cache: 'no-store' },
          currentUser
        );

        if (!response.ok) {
          throw new Error(response.status === 403 ? 'not-authorized' : 'session-check-failed');
        }

        if (!cancelled) {
          setUser(currentUser);
          setLoading(false);

          if (pathname === '/admin/login') {
            router.replace('/admin');
          }
        }
      } catch (error) {
        console.error('Admin session validation failed:', error);
        await signOut(auth).catch((signOutError) => {
          console.error('Failed to sign out unauthorized user:', signOutError);
        });

        if (!cancelled) {
          setUser(null);
          setLoading(false);
          const errorCode =
            error instanceof Error && error.message === 'not-authorized'
              ? 'not-authorized'
              : 'session-check-failed';
          router.replace(`/admin/login?error=${errorCode}`);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/admin" className="text-xl font-bold">
                Admin Panel
              </Link>
              <Link href="/admin" className="text-sm hover:underline">
                Dashboard
              </Link>
              <Link href="/admin/bulk_songs" className="text-sm hover:underline">
                Bulk Songs
              </Link>
              <Link href="/admin/assets" className="text-sm hover:underline">
                Assets
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
              )}
              <Link href="/" className="text-sm hover:underline">
                View Site
              </Link>
              <button
                onClick={handleLogout}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
