import { useEffect, useState } from 'react';
import { AlertCircle, Bookmark, LogIn, RefreshCw } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { backend } from '../lib/backend';
import type { Post } from '../lib/types';

export function SavedPage() {
  const { user } = useAuth();
  const { dataVersion, openAuth } = useUI();
  const [posts, setPosts] = useState<Post[]>([]);
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
        if (alive) setPosts(rows.filter((post) => post.kind === 'post'));
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
          description="나중에 다시 보고 싶은 급식 후기나 질문 글을 저장해 두세요."
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

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6 lg:py-8">
      <div className="mb-4">
        <h1 className="section-title">저장한 글</h1>
        <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
          나중에 다시 보고 싶은 글을 모아 뒀어요.
        </p>
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
          description="글의 북마크 아이콘을 누르면 여기에 모여요."
        />
      ) : (
        <div className="space-y-3">
          <p className="px-1 text-[11.5px] font-semibold text-zinc-400">저장한 글 {posts.length}개</p>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
