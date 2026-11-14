import { useEffect, useState } from 'react';
import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { Avatar } from './Avatar';
import { MediaBlock } from './MediaBlock';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { backend } from '../lib/backend';
import { formatCount, schoolLine, timeAgo } from '../lib/format';
import type { Post } from '../lib/types';

export function MediaCard({
  post,
  onTagClick,
}: {
  post: Post;
  onTagClick?: (tag: string) => void;
}) {
  const { user } = useAuth();
  const { requireAuth, openPost } = useUI();
  const { toast } = useToast();
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [bookmarked, setBookmarked] = useState(post.bookmarked);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLiked(post.liked);
    setLikeCount(post.like_count);
    setBookmarked(post.bookmarked);
  }, [post.id, post.liked, post.like_count, post.bookmarked]);

  const toggleLike = async () => {
    if (!user) {
      requireAuth('좋아요를 누르려면 로그인이 필요해요.');
      return;
    }
    if (pending) return;
    setPending(true);
    const prev = { liked, likeCount };
    setLiked(!liked);
    setLikeCount(liked ? Math.max(0, likeCount - 1) : likeCount + 1);
    try {
      const result = await backend.toggleLike(post.id, user.id);
      setLiked(result.liked);
      setLikeCount(result.count);
    } catch (err) {
      setLiked(prev.liked);
      setLikeCount(prev.likeCount);
      toast(err instanceof Error ? err.message : '좋아요를 저장하지 못했어요.', 'error');
    } finally {
      setPending(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      requireAuth('저장하려면 로그인이 필요해요.');
      return;
    }
    const prev = bookmarked;
    setBookmarked(!prev);
    try {
      const result = await backend.toggleBookmark(post.id, user.id);
      setBookmarked(result.bookmarked);
      toast(result.bookmarked ? '저장했어요. 프로필에서 다시 볼 수 있어요.' : '저장을 취소했어요.', 'success');
    } catch (err) {
      setBookmarked(prev);
      toast(err instanceof Error ? err.message : '저장하지 못했어요.', 'error');
    }
  };

  return (
    <article className="group relative h-full w-full snap-start overflow-hidden rounded-3xl bg-zinc-900 shadow-card lg:aspect-[4/5] lg:h-auto">
      <MediaBlock
        url={post.media_url}
        type={post.media_type}
        alt={post.body.slice(0, 60)}
        className="absolute inset-0 h-full w-full"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/15 to-zinc-950/45" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={post.author?.nickname ?? '?'} url={post.author?.avatar_url} size="sm" ring />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[12.5px] font-bold text-white">
              {post.author?.nickname ?? '알 수 없음'}
            </p>
            <p className="truncate text-[10.5px] font-medium text-white/70">
              {schoolLine(post.author)}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
          {post.media_type === 'video' ? '영상' : '사진'}
        </span>
      </div>

      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={toggleLike}
          aria-label="좋아요"
          aria-pressed={liked}
          className="flex flex-col items-center gap-1 text-white transition active:scale-90"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white/25">
            <Heart
              className={`h-[19px] w-[19px] transition ${liked ? 'animate-pop fill-rose-500 text-rose-500' : ''}`}
            />
          </span>
          <span className="text-[11px] font-bold tabular-nums">{formatCount(likeCount)}</span>
        </button>

        <button
          type="button"
          onClick={() => openPost(post.id)}
          aria-label="댓글 보기"
          className="flex flex-col items-center gap-1 text-white transition active:scale-90"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white/25">
            <MessageCircle className="h-[19px] w-[19px]" />
          </span>
          <span className="text-[11px] font-bold tabular-nums">{formatCount(post.comment_count)}</span>
        </button>

        <button
          type="button"
          onClick={toggleBookmark}
          aria-label="저장"
          aria-pressed={bookmarked}
          className="flex flex-col items-center gap-1 text-white transition active:scale-90"
        >
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur transition group-hover:bg-white/25">
            <Bookmark
              className={`h-[19px] w-[19px] transition ${bookmarked ? 'fill-amber-300 text-amber-300' : ''}`}
            />
          </span>
          <span className="text-[11px] font-bold">저장</span>
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 pr-16">
        <button type="button" onClick={() => openPost(post.id)} className="block text-left">
          <p className="line-clamp-3 text-[13.5px] font-medium leading-relaxed text-white drop-shadow-sm">
            {post.body}
          </p>
        </button>
        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur transition hover:bg-white/25"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-[10.5px] font-medium text-white/60">{timeAgo(post.created_at)}</p>
      </div>
    </article>
  );
}
