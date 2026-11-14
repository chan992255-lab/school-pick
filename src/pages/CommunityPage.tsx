import { useEffect, useState } from 'react';
import { AlertCircle, MessageSquare, PenLine, RefreshCw, Search, X } from 'lucide-react';
import { PostCard } from '../components/PostCard';
import { EmptyState } from '../components/EmptyState';
import { MealBoardCard } from '../components/MealBoardCard';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { backend } from '../lib/backend';
import { BOARDS, type Board, type Post } from '../lib/types';

export function CommunityPage({
  board,
  onBoardChange,
  onOpenMeal,
}: {
  board: Board | 'all';
  onBoardChange: (board: Board | 'all') => void;
  onOpenMeal: () => void;
}) {
  const { user } = useAuth();
  const { dataVersion, openUpload } = useUI();
  const [posts, setPosts] = useState<Post[]>([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    backend
      .listPosts({ kind: 'post', board, search: debounced, limit: 100 }, user?.id ?? null)
      .then((rows) => {
        if (alive) setPosts(rows);
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : '게시글을 불러오지 못했어요.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [board, debounced, dataVersion, user?.id]);

  const activeBoard = BOARDS.find((b) => b.id === board);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-4 lg:px-6 lg:py-8">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="section-title">커뮤니티</h1>
          <p className="mt-1 text-[13px] text-zinc-500 dark:text-zinc-400">
            {activeBoard ? activeBoard.description : '일상, 급식, 공부 질문까지 우리 학교 이야기'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openUpload(board === 'all' ? 'daily' : board)}
          className="btn-primary shrink-0"
        >
          <PenLine className="h-4 w-4" />
          글쓰기
        </button>
      </div>

      {board === 'meal' && <MealBoardCard onOpen={onOpenMeal} />}

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="급식, 공부, 학교생활 검색"
          className="field py-2.5 pl-10 pr-10 text-[13.5px]"
          aria-label="게시글 검색"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="검색어 지우기"
            className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 py-1">
        <button
          type="button"
          onClick={() => onBoardChange('all')}
          className={`chip ${board === 'all' ? 'chip-active' : ''}`}
        >
          전체
        </button>
        {BOARDS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => onBoardChange(b.id)}
            className={`chip ${board === b.id ? 'chip-active' : ''}`}
          >
            <span aria-hidden>{b.emoji}</span>
            {b.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card animate-pulse p-5">
              <div className="h-3 w-20 rounded-full bg-zinc-200 dark:bg-white/10" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-zinc-200 dark:bg-white/10" />
              <div className="mt-2 h-3 w-full rounded-full bg-zinc-100 dark:bg-white/5" />
              <div className="mt-1.5 h-3 w-5/6 rounded-full bg-zinc-100 dark:bg-white/5" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={debounced ? <Search className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
          title={debounced ? `'${debounced}' 검색 결과가 없어요` : '아직 글이 없어요'}
          description={
            debounced
              ? '다른 검색어로 찾아보거나, 궁금한 것을 직접 물어보세요.'
              : '급식 후기, 공부 질문, 오늘 있었던 일 — 첫 글을 남겨 보세요.'
          }
          action={
            <button
              type="button"
              onClick={() => openUpload(board === 'all' ? 'daily' : board)}
              className="btn-primary"
            >
              <PenLine className="h-4 w-4" />
              글쓰기
            </button>
          }
        />
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-[11.5px] font-semibold text-zinc-400">
            <span>글 {posts.length}개</span>
            <span className="inline-flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              최신순
            </span>
          </div>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
