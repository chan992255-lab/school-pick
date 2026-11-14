import { useEffect, useState } from 'react';
import {
  Bookmark,
  Check,
  GraduationCap,
  Heart,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Pencil,
  Sun,
  User as UserIcon,
  X,
} from 'lucide-react';
import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { MediaCard } from '../components/MediaCard';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { backend, isDemoMode } from '../lib/backend';
import { resetDemoData } from '../lib/demo';
import { formatDate, schoolLine } from '../lib/format';
import type { Post } from '../lib/types';

type Tab = 'posts' | 'saved';

export function ProfilePage() {
  const { user, profile, signOut, setProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const { dataVersion, openAuth, bumpData } = useUI();

  const [tab, setTab] = useState<Tab>('posts');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [saved, setSaved] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState(1);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setNickname(profile.nickname);
    setSchool(profile.school ?? '');
    setGrade(profile.grade ?? 1);
    setBio(profile.bio ?? '');
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setMyPosts([]);
      setSaved([]);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all([
      backend.listPosts({ authorId: user.id, limit: 100 }, user.id),
      backend.listPosts({ bookmarkedOnly: true, limit: 100 }, user.id),
    ])
      .then(([mine, bookmarks]) => {
        if (!alive) return;
        setMyPosts(mine);
        setSaved(bookmarks);
      })
      .catch((err: unknown) => {
        if (alive) toast(err instanceof Error ? err.message : '프로필 정보를 불러오지 못했어요.', 'error');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, dataVersion, toast]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
        <EmptyState
          icon={<UserIcon className="h-6 w-6" />}
          title="로그인하고 나만의 프로필을 만들어요"
          description="학교와 학년을 등록하면 같은 학교 친구들의 글을 더 쉽게 찾을 수 있어요."
          action={
            <button type="button" onClick={() => openAuth()} className="btn-primary">
              <LogIn className="h-4 w-4" />
              로그인 / 회원가입
            </button>
          }
        />
      </div>
    );
  }

  const receivedLikes = myPosts.reduce((sum, p) => sum + p.like_count, 0);

  const saveProfile = async () => {
    if (!profile) return;
    if (nickname.trim().length < 2) {
      toast('닉네임은 2자 이상 입력해 주세요.', 'error');
      return;
    }
    setSaving(true);
    try {
      const updated = await backend.updateProfile(profile.id, {
        nickname: nickname.trim(),
        school: school.trim() || null,
        grade,
        bio: bio.trim() || null,
      });
      setProfile(updated);
      bumpData();
      setEditing(false);
      toast('프로필을 저장했어요.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '프로필을 저장하지 못했어요.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast('로그아웃했어요.', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : '로그아웃하지 못했어요.', 'error');
    }
  };

  const handleReset = () => {
    if (!window.confirm('데모 데이터를 처음 상태로 되돌릴까요? 작성한 글과 로그인이 모두 사라집니다.')) {
      return;
    }
    resetDemoData();
    window.location.reload();
  };

  const list = tab === 'posts' ? myPosts : saved;
  const listMedia = list.filter((p) => p.kind === 'media');
  const listArticles = list.filter((p) => p.kind === 'post');

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-4 lg:px-6 lg:py-8">
      <div className="card overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-500 via-brand-600 to-violet-500" />
        <div className="px-4 pb-4 sm:px-6">
          <div className="-mt-9 flex items-end justify-between gap-3">
            <Avatar name={profile?.nickname ?? '?'} url={profile?.avatar_url} size="xl" ring />
            <div className="mb-1 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className="btn-soft py-2 text-[12.5px]"
              >
                {editing ? <X className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                {editing ? '취소' : '프로필 수정'}
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn-ghost py-2 text-[12.5px]"
                aria-label="로그아웃"
              >
                <LogOut className="h-3.5 w-3.5" />
                로그아웃
              </button>
            </div>
          </div>

          <div className="mt-3">
            <h1 className="text-[20px] font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {profile?.nickname ?? '이름 없음'}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-zinc-500 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5" />
                {schoolLine(profile)}
              </span>
              <span className="text-zinc-300 dark:text-zinc-600">|</span>
              <span>{user.email}</span>
              {profile && (
                <>
                  <span className="text-zinc-300 dark:text-zinc-600">|</span>
                  <span>{formatDate(profile.created_at)} 가입</span>
                </>
              )}
            </p>
            {profile?.bio && (
              <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-300">
                {profile.bio}
              </p>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-zinc-100 rounded-2xl bg-zinc-50 py-3 dark:divide-white/5 dark:bg-white/5">
            {[
              { label: '내 게시물', value: myPosts.length },
              { label: '받은 좋아요', value: receivedLikes },
              { label: '저장한 글', value: saved.length },
            ].map((stat) => (
              <div key={stat.label} className="px-2 text-center">
                <p className="text-[17px] font-extrabold tabular-nums text-zinc-900 dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {editing && (
            <div className="mt-4 space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
              <div>
                <label className="label" htmlFor="profile-nickname">
                  닉네임
                </label>
                <input
                  id="profile-nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  maxLength={12}
                  className="field py-2.5"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label" htmlFor="profile-school">
                    학교
                  </label>
                  <input
                    id="profile-school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    maxLength={30}
                    placeholder="예: 한빛고등학교"
                    className="field py-2.5"
                  />
                </div>
                <div>
                  <span className="label">학년</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[1, 2, 3].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`rounded-xl border py-2 text-[12.5px] font-bold transition ${
                          grade === g
                            ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                            : 'border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400'
                        }`}
                      >
                        {g}학년
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="label" htmlFor="profile-bio">
                  소개
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  maxLength={80}
                  placeholder="한 줄 소개를 남겨 보세요"
                  className="field resize-none py-2.5 text-[13.5px]"
                />
              </div>
              <button type="button" onClick={saveProfile} disabled={saving} className="btn-primary w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                저장하기
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="mb-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => setTab('posts')}
              className={`chip ${tab === 'posts' ? 'chip-active' : ''}`}
            >
              내 글 {myPosts.length}
            </button>
            <button
              type="button"
              onClick={() => setTab('saved')}
              className={`chip ${tab === 'saved' ? 'chip-active' : ''}`}
            >
              <Bookmark className="h-3 w-3" />
              저장한 글 {saved.length}
            </button>
          </div>

          {loading ? (
            <div className="grid place-items-center py-16 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <EmptyState
              icon={tab === 'posts' ? <Pencil className="h-6 w-6" /> : <Bookmark className="h-6 w-6" />}
              title={tab === 'posts' ? '아직 올린 글이 없어요' : '저장한 글이 없어요'}
              description={
                tab === 'posts'
                  ? '오늘의 사진이나 궁금한 점을 올려 보세요.'
                  : '마음에 드는 글의 북마크를 눌러 모아 보세요.'
              }
            />
          ) : (
            <div className="space-y-4">
              {listMedia.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {listMedia.map((post) => (
                    <div key={post.id} className="aspect-[4/5]">
                      <MediaCard post={post} />
                    </div>
                  ))}
                </div>
              )}
              {listArticles.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-3">
          <div className="card p-4">
            <p className="text-[12.5px] font-extrabold text-zinc-800 dark:text-zinc-200">화면 테마</p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12.5px] font-bold transition ${
                  theme === 'light'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                라이트
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[12.5px] font-bold transition ${
                  theme === 'dark'
                    ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border-zinc-200 text-zinc-500 dark:border-white/10 dark:text-zinc-400'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                다크
              </button>
            </div>
          </div>

          <div className="card p-4">
            <p className="text-[12.5px] font-extrabold text-zinc-800 dark:text-zinc-200">내 활동</p>
            <ul className="mt-2.5 space-y-2 text-[12.5px] text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 text-rose-400" />
                  받은 좋아요
                </span>
                <b className="text-zinc-900 dark:text-white">{receivedLikes}</b>
              </li>
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5">
                  <Bookmark className="h-3.5 w-3.5 text-amber-400" />
                  저장한 글
                </span>
                <b className="text-zinc-900 dark:text-white">{saved.length}</b>
              </li>
            </ul>
          </div>

          {isDemoMode && (
            <div className="card p-4">
              <p className="text-[12.5px] font-extrabold text-zinc-800 dark:text-zinc-200">데모 모드</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                글과 사진은 이 브라우저에만 저장돼요. Supabase를 연결하면 모든 기기에서 이어집니다.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-2.5 w-full rounded-xl border border-zinc-200 py-2 text-[11.5px] font-bold text-zinc-500 transition hover:border-rose-300 hover:text-rose-600 dark:border-white/10 dark:text-zinc-400"
              >
                데모 데이터 초기화
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
