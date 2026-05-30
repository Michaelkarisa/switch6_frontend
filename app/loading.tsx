import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-[var(--app-bg)]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 size={32} className="animate-spin text-[color:var(--green)]" />
        <span className="text-[13px] font-medium text-[color:var(--muted)]">Loading…</span>
      </div>
    </div>
  );
}
