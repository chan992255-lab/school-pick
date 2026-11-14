export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}일 전`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}주 전`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}개월 전`;
  return `${Math.floor(day / 365)}년 전`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1).replace(/\.0$/, '')}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}천`;
  return String(n);
}

export function gradeLabel(grade: number | null): string {
  return grade ? `${grade}학년` : '학년 미입력';
}

export function schoolLine(profile: { school: string | null; grade: number | null } | null): string {
  if (!profile) return '알 수 없음';
  const parts = [profile.school, gradeLabel(profile.grade)].filter(Boolean);
  return parts.length ? parts.join(' · ') : '학교 미입력';
}

export function initials(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return '?';
  return trimmed.slice(0, 1);
}

/** tailwind 색상 팔레트에서 닉네임별 색을 안정적으로 뽑는다. */
const AVATAR_COLORS = [
  'from-brand-400 to-brand-600',
  'from-rose-400 to-rose-600',
  'from-amber-400 to-orange-500',
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-blue-600',
  'from-fuchsia-400 to-purple-600',
];

export function avatarGradient(seed: string): string {
  let sum = 0;
  for (let i = 0; i < seed.length; i += 1) sum = (sum + seed.charCodeAt(i) * (i + 3)) % 997;
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
