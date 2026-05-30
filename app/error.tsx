'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error('[Switch6 Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-[var(--app-bg)] px-4 text-center">
      <div className="flex flex-col items-center gap-5 max-w-[400px]">
        <div className="grid place-items-center w-14 h-14 rounded-2xl border border-red-500/30 bg-red-500/10 text-[color:var(--red)]">
          <AlertTriangle size={26} />
        </div>
        <div>
          <h1 className="text-[20px] font-semibold text-[color:var(--text)] tracking-tight">Something went wrong</h1>
          <p className="text-[13px] text-[color:var(--muted)] mt-2 leading-relaxed">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          {error.digest && (
            <p className="text-[11px] font-mono text-[color:var(--faint)] mt-2">
              Error ID: {error.digest}
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <button onClick={reset}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[color:var(--green)] text-white text-[14px] font-medium cursor-pointer border-none hover:opacity-90 transition-opacity">
            Try again
          </button>
          <button onClick={() => window.location.href = '/dashboard'}
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[14px] font-medium cursor-pointer hover:border-green-500/40 transition-colors">
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
