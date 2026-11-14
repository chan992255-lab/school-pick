import { useEffect, useState } from 'react';
import { AlertCircle, Clapperboard, Plus, RefreshCw } from 'lucide-react';
import { MediaCard } from '../components/MediaCard';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { backend } from '../lib/backend';
import { TAGS, type Post } from '../lib/types';

export function FeedPage() {
  const { user } = useAuth();
  const { dataVersion, openUpload } = useUI();
  const [posts, setPosts] = useState<Post[]>([]);
  const [tag, setTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    backend
      .listPosts({ kind: 'media', tag, limit: 60 }, user?.id ?? null)
      .then((rows) => {
        if (alive) setPosts(rows);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '피드를 불러오지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [tag, dataVersion, user?.id]);

  return (
    <div className="flex h-full flex-col lg:h-auto">
      <div className="shrink-0 px-4 pb-2 pt-1 lg:px-0 lg:pb-4 lg:pt-0">
        <div className="mb-2 hidden items-end justify-between lg:flex">
          <div>
            <h1 className="section-title">쇼츠</h1>
            <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
              짧은 영상과 사진으로 오늘의 순간을 나눠요.
            </p>
          </div>
          <button type="button" onClick={() => openUpload('media')} className="btn-primary">
            <Plus className="h-4 w-4" />
            쇼츠 올리기
          </button>
        </div>

        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={`chip ${tag === null ? 'chip-active' : ''}`}
          >
            전체
          </button>
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag((prev) => (prev === t ? null : t))}
              className={`chip ${tag === t ? 'chip-active' : ''}`}
            >
              #{t}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain no-scrollbar lg:flex-none lg:overflow-visible">
        {loading ? (
          <div className="grid h-full place-items-center lg:h-72">
            <div className="flex flex-col items-center gap-2 text-zinc-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
              <span className="text-[12.5px] font-semibold">피드를 불러오는 중…</span>
            </div>
          </div>
        ) : error ? (
          <div className="mx-4 mt-3 flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : posts.length === 0 ? (
          <div className="grid h-full place-items-center px-4">
            <div className="w-full max-w-md">
              <EmptyState
                icon={<Clapperboard className="h-6 w-6" />}
                title={tag ? `#${tag} 쇼츠가 아직 없어요` : '아직 올라온 쇼츠가 없어요'}
                description="첫 번째 사진이나 짧은 영상을 올려 보세요. 친구들이 좋아요와 댓글을 남길 수 있어요."
                action={
                  <button type="button" onClick={() => openUpload('media')} className="btn-primary">
                    <Plus className="h-4 w-4" />
                    첫 쇼츠 올리기
                  </button>
                }
              />
            </div>
          </div>
        ) : (
          <div className="h-full space-y-2 px-3 pb-16 lg:grid lg:h-auto lg:grid-cols-2 lg:gap-6 lg:space-y-0 lg:px-0 lg:pb-0 xl:grid-cols-3">
            {posts.map((post) => (
              <div key={post.id} className="h-full w-full snap-start pb-2 lg:h-auto lg:pb-0">
                <MediaCard post={post} onTagClick={(t) => setTag(t)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
