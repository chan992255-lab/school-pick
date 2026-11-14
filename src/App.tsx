import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bookmark,
  LogIn,
  Map as MapIcon,
  MessagesSquare,
  Moon,
  Plus,
  Sun,
  User as UserIcon,
  UtensilsCrossed,
} from 'lucide-react';
import { Logo } from './components/Logo';
import { Avatar } from './components/Avatar';
import { SetupBanner } from './components/SetupBanner';
import { AuthModal } from './components/AuthModal';
import { UploadModal } from './components/UploadModal';
import { PostDetailModal } from './components/PostDetailModal';
import { CommunityPage } from './pages/CommunityPage';
import { MapPage } from './pages/MapPage';
import { MealPage } from './pages/MealPage';
import { SavedPage } from './pages/SavedPage';
import { ProfilePage } from './pages/ProfilePage';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { UIProvider, useUI } from './context/UIContext';
import { schoolLine } from './lib/format';
import type { Board } from './lib/types';

type Route =
  | { name: 'map' }
  | { name: 'community'; board: Board | 'all' }
  | { name: 'meal' }
  | { name: 'saved' }
  | { name: 'profile' };

const BOARDS_SET = new Set(['daily', 'meal', 'qna']);

function parseHash(): { route: Route; postId: string | null } {
  const clean = window.location.hash.replace(/^#\/?/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts[0] === 'post' && parts[1]) {
    return { route: { name: 'community', board: 'all' }, postId: parts[1] };
  }
  if (parts[0] === 'map') return { route: { name: 'map' }, postId: null };
  if (parts[0] === 'community') {
    const board = parts[1] && BOARDS_SET.has(parts[1]) ? (parts[1] as Board) : 'all';
    return { route: { name: 'community', board }, postId: null };
  }
  if (parts[0] === 'meal') return { route: { name: 'meal' }, postId: null };
  if (parts[0] === 'saved') return { route: { name: 'saved' }, postId: null };
  if (parts[0] === 'profile') return { route: { name: 'profile' }, postId: null };
  // 첫 화면(빈 해시)은 전국 고등학교 지도다. 예전 쇼츠(#/shorts) 링크는 커뮤니티로 보낸다.
  if (parts[0] === 'shorts') return { route: { name: 'community', board: 'all' }, postId: null };
  return { route: { name: 'map' }, postId: null };
}

function hashFor(route: Route): string {
  switch (route.name) {
    case 'map':
      return '#/map';
    case 'community':
      return route.board === 'all' ? '#/community' : `#/community/${route.board}`;
    case 'meal':
      return '#/meal';
    case 'saved':
      return '#/saved';
    case 'profile':
      return '#/profile';
    default:
      return '#/map';
  }
}

function NavItem({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-bold transition ${
        active
          ? 'text-brand-600 dark:text-brand-300'
          : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SidebarLink({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[14px] font-bold transition ${
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
          : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Shell() {
  const { user, profile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { openAuth, openUpload, openPost, closePost, postId } = useUI();
  const [route, setRoute] = useState<Route>(() => parseHash().route);
  const mainRef = useRef<HTMLElement | null>(null);

  const navigate = useCallback((next: Route) => {
    const hash = hashFor(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(next);
  }, []);

  useEffect(() => {
    const apply = () => {
      const parsed = parseHash();
      setRoute(parsed.route);
      if (parsed.postId) openPost(parsed.postId);
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, [openPost]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [route]);

  // 이메일 인증 링크로 돌아온 경우(#access_token=...) 해시를 정리해 라우팅과 섞이지 않게 한다.
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('access_token=') && !hash.includes('error_description=')) return;
    const timer = window.setTimeout(() => {
      window.location.hash = '#/map';
    }, 700);
    return () => window.clearTimeout(timer);
  }, []);

  const closePostAndHash = useCallback(() => {
    closePost();
    if (window.location.hash.startsWith('#/post/')) {
      window.location.hash = hashFor(route);
    }
  }, [closePost, route]);

  const navItems = [
    {
      key: 'map',
      label: '지도',
      icon: <MapIcon className="h-[21px] w-[21px]" strokeWidth={2.1} />,
      active: route.name === 'map',
      onClick: () => navigate({ name: 'map' }),
    },
    {
      key: 'community',
      label: '커뮤니티',
      icon: <MessagesSquare className="h-[21px] w-[21px]" strokeWidth={2.1} />,
      active: route.name === 'community',
      onClick: () => navigate({ name: 'community', board: 'all' }),
    },
    {
      key: 'meal',
      label: '급식표',
      icon: <UtensilsCrossed className="h-[21px] w-[21px]" strokeWidth={2.1} />,
      active: route.name === 'meal',
      onClick: () => navigate({ name: 'meal' }),
    },
    {
      key: 'saved',
      label: '저장',
      icon: <Bookmark className="h-[21px] w-[21px]" strokeWidth={2.1} />,
      active: route.name === 'saved',
      onClick: () => navigate({ name: 'saved' }),
    },
    {
      key: 'profile',
      label: '프로필',
      icon: <UserIcon className="h-[21px] w-[21px]" strokeWidth={2.1} />,
      active: route.name === 'profile',
      onClick: () => navigate({ name: 'profile' }),
    },
  ];

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* 데스크톱 사이드바 */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-zinc-200 bg-white px-4 py-6 lg:flex dark:border-white/10 dark:bg-zinc-950">
        <button type="button" onClick={() => navigate({ name: 'map' })} className="px-1.5 text-left">
          <Logo />
        </button>

        <nav className="mt-7 space-y-1">
          <SidebarLink
            active={route.name === 'map'}
            icon={<MapIcon className="h-[18px] w-[18px]" />}
            label="고등학교 지도"
            onClick={() => navigate({ name: 'map' })}
          />
          <SidebarLink
            active={route.name === 'community'}
            icon={<MessagesSquare className="h-[18px] w-[18px]" />}
            label="커뮤니티"
            onClick={() => navigate({ name: 'community', board: 'all' })}
          />
          <SidebarLink
            active={route.name === 'meal'}
            icon={<UtensilsCrossed className="h-[18px] w-[18px]" />}
            label="오늘 급식표"
            onClick={() => navigate({ name: 'meal' })}
          />
          <SidebarLink
            active={route.name === 'saved'}
            icon={<Bookmark className="h-[18px] w-[18px]" />}
            label="저장한 글"
            onClick={() => navigate({ name: 'saved' })}
          />
          <SidebarLink
            active={route.name === 'profile'}
            icon={<UserIcon className="h-[18px] w-[18px]" />}
            label="내 프로필"
            onClick={() => navigate({ name: 'profile' })}
          />
        </nav>

        <button
          type="button"
          onClick={() => openUpload()}
          className="btn-primary mt-4 w-full py-2.5"
        >
          <Plus className="h-4 w-4" />
          글쓰기
        </button>

        <div className="mt-auto space-y-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-[13px] font-bold text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {theme === 'dark' ? '라이트 모드' : '다크 모드'}
          </button>

          {user && profile ? (
            <button
              type="button"
              onClick={() => navigate({ name: 'profile' })}
              className="flex w-full items-center gap-2.5 rounded-2xl border border-zinc-200 p-2.5 text-left transition hover:bg-zinc-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <Avatar name={profile.nickname} url={profile.avatar_url} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-bold text-zinc-800 dark:text-zinc-100">
                  {profile.nickname}
                </span>
                <span className="block truncate text-[10.5px] text-zinc-500 dark:text-zinc-400">
                  {schoolLine(profile)}
                </span>
              </span>
            </button>
          ) : (
            <button type="button" onClick={() => openAuth()} className="btn-soft w-full py-2.5">
              <LogIn className="h-4 w-4" />
              로그인 / 회원가입
            </button>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 모바일 헤더 */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white/90 px-4 backdrop-blur lg:hidden dark:border-white/10 dark:bg-zinc-950/90">
          <button type="button" onClick={() => navigate({ name: 'map' })}>
            <Logo />
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="테마 변경"
              className="grid h-9 w-9 place-items-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/10"
            >
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            {user && profile ? (
              <button
                type="button"
                onClick={() => navigate({ name: 'profile' })}
                aria-label="내 프로필"
                className="ml-0.5"
              >
                <Avatar name={profile.nickname} url={profile.avatar_url} size="sm" />
              </button>
            ) : (
              <button type="button" onClick={() => openAuth()} className="btn-soft ml-1 px-3 py-1.5 text-[12px]">
                로그인
              </button>
            )}
          </div>
        </header>

        <SetupBanner />

        <main
          ref={mainRef}
          className={`min-h-0 flex-1 ${route.name === 'map' ? 'overflow-hidden' : 'overflow-y-auto'}`}
        >
          {route.name === 'map' && <MapPage onOpenMeal={() => navigate({ name: 'meal' })} />}
          {route.name === 'community' && (
            <CommunityPage
              board={route.board}
              onBoardChange={(board) => navigate({ name: 'community', board })}
              onOpenMeal={() => navigate({ name: 'meal' })}
            />
          )}
          {route.name === 'meal' && <MealPage />}
          {route.name === 'saved' && <SavedPage />}
          {route.name === 'profile' && <ProfilePage />}
        </main>

        {/* 모바일 하단 탭: 지도 · 커뮤니티 · 급식표 · 저장 · 프로필 (글쓰기는 떠 있는 버튼) */}
        <nav className="relative shrink-0 border-t border-zinc-200 bg-white/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur lg:hidden dark:border-white/10 dark:bg-zinc-950/95">
          <div className="flex items-center">
            {navItems.map((item) => (
              <NavItem
                key={item.key}
                active={item.active}
                icon={item.icon}
                label={item.label}
                onClick={item.onClick}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => openUpload()}
            aria-label="새 글 쓰기"
            className="absolute -top-16 right-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-float transition active:scale-95"
          >
            <Plus className="h-6 w-6" strokeWidth={2.4} />
          </button>
        </nav>
      </div>

      {postId && <PostDetailModal postId={postId} onClose={closePostAndHash} />}
    </div>
  );
}

function Modals() {
  const {
    authOpen,
    authMessage,
    closeAuth,
    upload,
    closeUpload,
    bumpData,
    pendingAfterAuth,
    clearPending,
  } = useUI();

  return (
    <>
      <AuthModal
        open={authOpen}
        message={authMessage}
        onClose={closeAuth}
        onSuccess={() => {
          closeAuth();
          bumpData();
          const next = pendingAfterAuth;
          clearPending();
          next?.();
        }}
      />
      {upload && (
        <UploadModal
          open
          initialBoard={upload.board}
          initialDraft={upload.draft}
          onClose={closeUpload}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <UIProvider>
      <Shell />
      <Modals />
    </UIProvider>
  );
}
