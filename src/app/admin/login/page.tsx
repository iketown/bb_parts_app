'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { authenticatedFetch } from '@/lib/api-client';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  signOut,
  type User,
} from 'firebase/auth';

type AuthMode = 'sign-in' | 'sign-up' | 'reset';

function AdminLoginPageContent() {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryErrorCode = searchParams.get('error');
  const queryError = queryErrorCode === 'not-authorized'
    ? 'This email is not allowed to access the admin panel.'
    : queryErrorCode === 'session-check-failed'
      ? 'Could not verify admin access. Please try again.'
      : '';

  const setAuthMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
  };

  const finalizeLogin = async (user: User) => {
    const response = await authenticatedFetch(
      '/api/admin/session',
      { cache: 'no-store' },
      user
    );

    if (response.ok) {
      router.replace('/admin');
      return;
    }

    await signOut(auth);

    if (response.status === 403) {
      throw new Error('not-authorized');
    }

    throw new Error('session-check-failed');
  };

  const ensureEmailIsAllowed = async (emailAddress: string) => {
    const response = await fetch('/api/admin/allowed-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: emailAddress }),
    });

    if (response.ok) {
      return;
    }

    if (response.status === 403) {
      throw new Error('not-authorized');
    }

    throw new Error('email-check-failed');
  };

  const getEmailSignInErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        return 'Invalid email or password';
      }

      if (error.code === 'auth/user-not-found') {
        return 'No account found with this email';
      }

      if (error.code === 'auth/invalid-email') {
        return 'Invalid email address';
      }
    }

    if (error instanceof Error && error.message === 'not-authorized') {
      return 'This email is not allowed to access the admin panel.';
    }

    return 'Login failed. Please try again.';
  };

  const getEmailSignUpErrorMessage = (error: unknown) => {
    if (error instanceof FirebaseError) {
      if (error.code === 'auth/email-already-in-use') {
        return 'This email already has an account. Sign in or reset the password instead.';
      }

      if (error.code === 'auth/invalid-email') {
        return 'Invalid email address';
      }

      if (error.code === 'auth/weak-password') {
        return 'Password should be at least 6 characters.';
      }
    }

    if (error instanceof Error && error.message === 'not-authorized') {
      return 'This email is not allowed to access the admin panel.';
    }

    return 'Could not create the account. Please try again.';
  };

  const getPasswordResetMessage = (error: unknown) => {
    if (error instanceof FirebaseError && error.code === 'auth/invalid-email') {
      return 'Invalid email address';
    }

    if (error instanceof Error && error.message === 'not-authorized') {
      return 'This email is not allowed to access the admin panel.';
    }

    return 'Could not send a reset email. Please try again.';
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);
      const trimmedEmail = email.trim();

      if (mode === 'sign-in') {
        const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
        await finalizeLogin(credential.user);
        return;
      }

      if (mode === 'sign-up') {
        await ensureEmailIsAllowed(trimmedEmail);
        const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
        await finalizeLogin(credential.user);
        return;
      }

      await ensureEmailIsAllowed(trimmedEmail);
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccess('Password reset email sent.');
    } catch (err: unknown) {
      console.error('Admin auth error:', err);
      if (mode === 'sign-in') {
        setError(getEmailSignInErrorMessage(err));
      } else if (mode === 'sign-up') {
        setError(getEmailSignUpErrorMessage(err));
      } else {
        setError(getPasswordResetMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const title =
    mode === 'sign-in'
      ? 'Admin Login'
      : mode === 'sign-up'
        ? 'Create Admin Account'
        : 'Reset Admin Password';

  const description =
    mode === 'sign-in'
      ? 'Sign in with a Firebase account that uses an approved admin email'
      : mode === 'sign-up'
        ? 'Create a Firebase email/password account for an approved admin email'
        : 'Send a password reset email to an approved admin email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="text-center text-3xl font-bold">{title}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-100 p-1 text-sm">
          <button
            type="button"
            onClick={() => setAuthMode('sign-in')}
            className={`rounded-md px-3 py-2 ${
              mode === 'sign-in' ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('sign-up')}
            className={`rounded-md px-3 py-2 ${
              mode === 'sign-up' ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setAuthMode('reset')}
            className={`rounded-md px-3 py-2 ${
              mode === 'reset' ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Reset
          </button>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleEmailAuth}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {mode !== 'reset' && (
              <div>
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
                  required
                  className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder={mode === 'sign-up' ? 'Create a password' : 'Password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {(queryError || error) && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded">
              {queryError || error}
            </div>
          )}

          {success && (
            <div className="text-green-700 text-sm text-center bg-green-50 p-3 rounded">
              {success}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading
                ? mode === 'sign-in'
                  ? 'Signing in...'
                  : mode === 'sign-up'
                    ? 'Creating account...'
                    : 'Sending reset email...'
                : mode === 'sign-in'
                  ? 'Sign In'
                  : mode === 'sign-up'
                    ? 'Create Account'
                    : 'Send Reset Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-600">Loading...</div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <AdminLoginPageContent />
    </Suspense>
  );
}
