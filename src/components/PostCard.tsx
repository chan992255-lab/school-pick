import { Bookmark, Heart, MessageCircle } from 'lucide-react';
import { Avatar } from './Avatar';
import { MediaBlock } from './MediaBlock';
import { useUI } from '../context/UIContext';
import { BOARD_LABEL } from '../lib/types';
import { formatCount, schoolLine, timeAgo } from '../lib/format';
import type { Post } from '../lib/types';

const BOARD_STYLE: Record<string, string> = {
  daily: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  meal: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  qna: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export function PostCard({ post }: { post: Post }) {
  const { openPost } = useUI();
  const boardLabel = post.board ? BOARD_LABEL[post.board] : '커뮤니티';

  return (
    <article
      onClick={() => openPost(post.id)}
      className="card cursor-pointer p-4 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-5"
    >
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            post.board ? BOARD_STYLE[post.board] : 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300'
          }`}
        >
          {boardLabel}
        </span>
        <span className="text-[11px] font-medium text-zinc-400">{timeAgo(post.created_at)}</span>
        {post.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-[11px] font-semibold text-brand-500 dark:text-brand-300">
            #{tag}
          </span>
        ))}
      </div>

      <h3 className="mt-2.5 text-[15.5px] font-extrabold leading-snug tracking-tight text-zinc-900 dark:text-white">
        {post.title ?? post.body.slice(0, 40)}
      </h3>
      <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[13.5px] leading-relaxed text-zinc-600 dark:text-zinc-400">
        {post.body}
      </p>

      {post.media_url && (
        <div className="mt-3 overflow-hidden rounded-2xl">
          <MediaBlock
            url={post.media_url}
            type={post.media_type}
            alt={post.title ?? '첨부 이미지'}
            className="max-h-72 w-full"
            controls={false}
          />
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-white/5">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar name={post.author?.nickname ?? '?'} url={post.author?.avatar_url} size="xs" />
          <span className="truncate text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
            {post.author?.nickname ?? '알 수 없음'}
          </span>
          <span className="hidden truncate text-[11px] text-zinc-400 sm:inline">
            {schoolLine(post.author)}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[11.5px] font-bold text-zinc-500 dark:text-zinc-400">
          <span className="inline-flex items-center gap-1">
            <Heart className={`h-3.5 w-3.5 ${post.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
            {formatCount(post.like_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" />
            {formatCount(post.comment_count)}
          </span>
          <Bookmark
            className={`h-3.5 w-3.5 ${post.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`}
          />
        </div>
      </div>
    </article>
  );
}
