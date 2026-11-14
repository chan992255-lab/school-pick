import { useEffect, useState } from 'react';
import { AlertCircle, Bookmark, LogIn, RefreshCw } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { PostCard } from '../components/PostCard';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { backend } from '../lib/backend';
import type { Post } from '../lib/types';

type Tab = 'all' | 'media' | 'post';

export function SavedPage() {
  const { user } = useAuth();
  const { dataVersion, openAuth } = useUI();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tab, setTab] = useState<Tab>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    backend
      .listPosts({ bookmarkedOnly: true, limit: 100 }, user.id)
      .then((rows) => {
        if (alive) setPosts(rows);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '저장한 글을 불러오지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user, dataVersion]);

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10 lg:px-6">
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="로그인하면 저장한 글을 모아 볼 수 있어요"
          description="마음에 드는 쇼츠나 나중에 다시 보고 싶은 글을 저장해 두세요."
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

  const media = posts.filter((p) => p.kind === 'media');
  const articles = posts.filter((p) => p.kind === 'post');
  const showMedia = tab !== 'post';
  const showArticles = tab !== 'media';

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-4 lg:px-6 lg:py-8">
      <div className="mb-4">
        <h1 className="section-title">저장한 글</h1>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          나중에 다시 보고 싶은 쇼츠와 글을 모아 뒀어요.
        </p>
      </div>

      <div className="no-scrollbar -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 py-1">
        {(
          [
            { id: 'all' as Tab, label: `전체 ${posts.length}` },
            { id: 'media' as Tab, label: `쇼츠 ${media.length}` },
            { id: 'post' as Tab, label: `커뮤니티 ${articles.length}` },
          ]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`chip ${tab === t.id ? 'chip-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-20 text-zinc-400">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<Bookmark className="h-6 w-6" />}
          title="저장한 게 아직 없어요"
          description="쇼츠나 글의 북마크 아이콘을 누르면 여기에 모여요."
        />
      ) : (
        <div className="space-y-8">
          {showMedia && media.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-extrabold text-zinc-700 dark:text-zinc-300">
                저장한 쇼츠 {media.length}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {media.map((post) => (
                  <div key={post.id} className="aspect-[4/5]">
                    <MediaCard post={post} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {showArticles && articles.length > 0 && (
            <section>
              <h2 className="mb-3 text-[13px] font-extrabold text-zinc-700 dark:text-zinc-300">
                저장한 글 {articles.length}
              </h2>
              <div className="space-y-3">
                {articles.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            </section>
          )}

          {((!showMedia || media.length === 0) && (!showArticles || articles.length === 0)) && (
            <EmptyState
              icon={<Bookmark className="h-6 w-6" />}
              title="이 탭에 저장한 게 없어요"
              description="다른 탭을 눌러 저장한 항목을 확인해 보세요."
            />
          )}
        </div>
      )}
    </div>
  );
}
