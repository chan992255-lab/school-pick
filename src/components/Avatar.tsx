import { avatarGradient, initials } from '../lib/format';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<Size, string> = {
  xs: 'h-7 w-7 text-[11px]',
  sm: 'h-8 w-8 text-[12px]',
  md: 'h-10 w-10 text-[14px]',
  lg: 'h-14 w-14 text-lg',
  xl: 'h-20 w-20 text-2xl',
};

export function Avatar({
  name,
  url = null,
  size = 'md',
  ring = false,
}: {
  name: string;
  url?: string | null;
  size?: Size;
  ring?: boolean;
}) {
  const ringClass = ring
    ? 'ring-2 ring-white/90 dark:ring-zinc-900'
    : '';

  if (url) {
    return (
      <img
        src={url}
        alt={`${name} 프로필 사진`}
        className={`${SIZES[size]} shrink-0 rounded-full object-cover ${ringClass}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`${SIZES[size]} ${ringClass} grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${avatarGradient(
        name,
      )} font-bold text-white`}
    >
      {initials(name)}
    </span>
  );
}
