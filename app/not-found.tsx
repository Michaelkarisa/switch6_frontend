import Link from 'next/link';
import { Radio } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center bg-[var(--app-bg)] px-4 text-center">
      <div className="flex flex-col items-center gap-5 max-w-[400px]">
        <div className="grid place-items-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-green-600">
          <Radio size={32} color="#fff" />
        </div>
        <div>
          <div className="text-[80px] font-semibold leading-none tracking-[-0.05em] text-[color:var(--text)] font-mono">404</div>
          <h1 className="text-[22px] font-semibold text-[color:var(--text)] mt-2 tracking-tight">Page not found</h1>
          <p className="text-[14px] text-[color:var(--muted)] mt-2 leading-relaxed">
            This page doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          <Link href="/dashboard"
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg bg-[color:var(--green)] text-white text-[14px] font-medium no-underline hover:opacity-90 transition-opacity">
            Go to dashboard
          </Link>
          <Link href="/"
            className="inline-flex items-center justify-center h-10 px-5 rounded-lg border border-[color:var(--border)] bg-[color:var(--surface2)] text-[color:var(--text)] text-[14px] font-medium no-underline hover:border-green-500/40 transition-colors">
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
