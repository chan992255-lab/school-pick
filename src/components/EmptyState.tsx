import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-white/10">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500">
        {icon}
      </div>
      <p className="text-[15px] font-bold text-zinc-800 dark:text-zinc-100">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
