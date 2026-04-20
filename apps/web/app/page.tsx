'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';

export default function SignInPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGitHub = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await signIn('github', { callbackUrl: '/' });
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'sign_in_failed');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl shadow-black/40">
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/15">
            <span className="text-xl font-bold tracking-tight text-blue-400">M2</span>
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-white">ME2</h1>
          <p className="mt-1 text-center text-sm text-zinc-400">
            Personal AI Delegation Assistant
          </p>
        </div>

        <button
          type="button"
          onClick={handleGitHub}
          disabled={submitting}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-blue-500/40"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-4 w-4 fill-current"
          >
            <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.57.11.78-.25.78-.55 0-.27-.01-.99-.02-1.94-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.95.1-.74.4-1.25.72-1.54-2.56-.29-5.26-1.28-5.26-5.69 0-1.26.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.12 3.04.74.8 1.18 1.82 1.18 3.08 0 4.42-2.7 5.39-5.28 5.68.41.35.78 1.05.78 2.12 0 1.53-.01 2.77-.01 3.15 0 .3.21.67.79.55A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z" />
          </svg>
          {submitting ? 'Redirecting…' : 'Sign in with GitHub'}
        </button>

        {error && (
          <p role="alert" className="mt-4 text-center text-xs text-red-400">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-500">
          Sign in with Apple coming soon.
          <br />
          By continuing you agree to the terms of service.
        </p>
      </div>
    </main>
  );
}
