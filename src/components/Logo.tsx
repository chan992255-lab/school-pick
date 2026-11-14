import { GraduationCap } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-float">
        <GraduationCap className="h-5 w-5" strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[17px] font-extrabold tracking-tight text-zinc-900 dark:text-white">
            스쿨픽
          </span>
          <span className="mt-1 text-[10px] font-semibold tracking-wide text-zinc-400">
            SCHOOL PICK
          </span>
        </span>
      )}
    </div>
  );
}
