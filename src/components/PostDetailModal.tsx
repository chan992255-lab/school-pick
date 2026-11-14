import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  Bookmark,
  Heart,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { Avatar } from './Avatar';
import { MediaBlock } from './MediaBlock';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUI } from '../context/UIContext';
import { backend } from '../lib/backend';
import { BOARD_LABEL } from '../lib/types';
import { formatCount, schoolLine, timeAgo } from '../lib/format';
import type { Comment, Post } from '../lib/types';

export function PostDetailModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const { user, profile } = useAuth();
  const { requireAuth, openAuth, bumpData } = useUI();
  const { toast } = useToast();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPost, nextComments] = await Promise.all([
        backend.getPost(postId, user?.id ?? null),
        backend.listComments(postId),
      ]);
      setPost(nextPost);
      setComments(nextComments);
    } catch (err) {
      setError(err instanceof Error ? err.message : '게시물을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [postId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const toggleLike = async () => {
    if (!post) return;
    if (!user) {
      openAuth('좋아요를 누르려면 로그인이 필요해요.');
      return;
    }
    const prev = { liked: post.liked, count: post.like_count };
    setPost({ ...post, liked: !prev.liked, like_count: prev.liked ? prev.count - 1 : prev.count + 1 });
    try {
      const result = await backend.toggleLike(post.id, user.id);
      setPost((p) => (p ? { ...p, liked: result.liked, like_count: result.count } : p));
    } catch (err) {
      setPost((p) => (p ? { ...p, liked: prev.liked, like_count: prev.count } : p));
      toast(err instanceof Error ? err.message : '좋아요를 저장하지 못했어요.', 'error');
    }
  };

  const toggleBookmark = async () => {
    if (!post) return;
    if (!user) {
      openAuth('저장하려면 로그인이 필요해요.');
      return;
    }
    const prev = post.bookmarked;
    setPost({ ...post, bookmarked: !prev });
    try {
      const result = await backend.toggleBookmark(post.id, user.id);
      setPost((p) => (p ? { ...p, bookmarked: result.bookmarked } : p));
      bumpData();
      toast(result.bookmarked ? '저장했어요.' : '저장을 취소했어요.', 'success');
    } catch (err) {
      setPost((p) => (p ? { ...p, bookmarked: prev } : p));
      toast(err instanceof Error ? err.message : '저장하지 못했어요.', 'error');
    }
  };

  const share = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/post/${postId}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: post?.title ?? '스쿨픽', url });
      } else {
        await navigator.clipboard.writeText(url);
        toast('링크를 복사했어요.', 'success');
      }
    } catch {
      /* 사용자가 공유를 취소한 경우 */
    }
  };

  const addComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) {
      requireAuth('댓글을 쓰려면 로그인이 필요해요.');
      return;
    }
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const created = await backend.addComment(postId, text.trim(), profile);
      setComments((prev) => [...prev, created]);
      setPost((p) => (p ? { ...p, comment_count: p.comment_count + 1 } : p));
      setText('');
      bumpData();
    } catch (err) {
      toast(err instanceof Error ? err.message : '댓글을 남기지 못했어요.', 'error');
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: string) => {
    try {
      await backend.deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      setPost((p) => (p ? { ...p, comment_count: Math.max(0, p.comment_count - 1) } : p));
      bumpData();
    } catch (err) {
      toast(err instanceof Error ? err.message : '댓글을 삭제하지 못했어요.', 'error');
    }
  };

  const removePost = async () => {
    if (!post) return;
    try {
      await backend.deletePost(post.id);
      bumpData();
      toast('게시물을 삭제했어요.', 'success');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : '게시물을 삭제하지 못했어요.', 'error');
    }
  };

  const isMine = Boolean(user && post && post.author_id === user.id);

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/55 backdrop-blur-sm animate-fade-in"
      />
      <div className="relative z-10 flex h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl animate-sheet-up sm:h-auto sm:max-h-[88dvh] sm:max-w-2xl sm:rounded-3xl sm:animate-slide-up dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-white/10">
          <p className="text-[13.5px] font-extrabold tracking-tight text-zinc-900 dark:text-white">
            {post?.kind === 'post' ? '커뮤니티 글' : '게시물'}
          </p>
          <div className="flex items-center gap-1">
            {isMine && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                aria-label="게시물 삭제"
                className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="상세 창 닫기"
              className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <div className="m-6 flex items-start gap-2 rounded-2xl bg-rose-50 p-4 text-[13px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : !post ? (
            <div className="p-10 text-center text-[13px] text-zinc-500">삭제되었거나 없는 게시물이에요.</div>
          ) : (
            <div className="px-4 py-4 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={post.author?.nickname ?? '?'} url={post.author?.avatar_url} size="md" />
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-[13.5px] font-bold text-zinc-900 dark:text-white">
                      {post.author?.nickname ?? '알 수 없음'}
                    </p>
                    <p className="truncate text-[11.5px] text-zinc-500 dark:text-zinc-400">
                      {schoolLine(post.author)} · {timeAgo(post.created_at)}
                    </p>
                  </div>
                </div>
                {post.board && (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-extrabold text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                    {BOARD_LABEL[post.board]}
                  </span>
                )}
              </div>

              {post.title && (
                <h2 className="mt-3.5 text-[18px] font-extrabold leading-snug tracking-tight text-zinc-900 dark:text-white">
                  {post.title}
                </h2>
              )}
              <p className="mt-2 whitespace-pre-wrap text-[14px] leading-[1.7] text-zinc-700 dark:text-zinc-300">
                {post.body}
              </p>

              {post.media_url && (
                <div className="mt-3.5 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800">
                  <MediaBlock
                    url={post.media_url}
                    type={post.media_type}
                    alt={post.title ?? '첨부 미디어'}
                    className={post.media_type === 'video' ? 'max-h-[420px] w-full' : 'max-h-[520px] w-full'}
                  />
                </div>
              )}

              {post.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-brand-50 px-2.5 py-1 text-[11.5px] font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-200"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleLike}
                  aria-pressed={post.liked}
                  aria-label="좋아요"
                  className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12.5px] font-bold transition ${
                    post.liked
                      ? 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                      : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-300'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${post.liked ? 'fill-rose-500 text-rose-500' : ''}`} />
                  좋아요 {formatCount(post.like_count)}
                </button>
                <span className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-3.5 py-2 text-[12.5px] font-bold text-zinc-600 dark:border-white/10 dark:text-zinc-300">
                  <MessageCircle className="h-4 w-4" />
                  댓글 {formatCount(post.comment_count)}
                </span>
                <button
                  type="button"
                  onClick={toggleBookmark}
                  aria-pressed={post.bookmarked}
                  className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                    post.bookmarked
                      ? 'border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 dark:border-white/10 dark:text-zinc-400'
                  }`}
                  aria-label="저장"
                >
                  <Bookmark className={`h-4 w-4 ${post.bookmarked ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={share}
                  className="ml-auto grid h-9 w-9 place-items-center rounded-full border border-zinc-200 text-zinc-500 transition hover:text-zinc-800 dark:border-white/10 dark:text-zinc-400"
                  aria-label="공유"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>

              {confirmDelete && (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-rose-50 px-3.5 py-2.5 dark:bg-rose-500/10">
                  <span className="text-[12.5px] font-bold text-rose-700 dark:text-rose-300">
                    이 게시물을 삭제할까요?
                  </span>
                  <span className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-full px-2.5 py-1 text-[12px] font-bold text-rose-700/70 hover:bg-white/60 dark:text-rose-200/70"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={removePost}
                      className="rounded-full bg-rose-600 px-3 py-1 text-[12px] font-bold text-white hover:bg-rose-700"
                    >
                      삭제
                    </button>
                  </span>
                </div>
              )}

              <div className="mt-5 border-t border-zinc-100 pt-4 dark:border-white/10">
                <p className="mb-2.5 text-[12.5px] font-extrabold text-zinc-800 dark:text-zinc-200">
                  댓글 {comments.length}
                </p>
                <ul className="space-y-3">
                  {comments.map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5">
                      <Avatar name={c.author?.nickname ?? '?'} url={c.author?.avatar_url} size="sm" />
                      <div className="min-w-0 flex-1 rounded-2xl bg-zinc-50 px-3 py-2 dark:bg-white/5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-bold text-zinc-900 dark:text-white">
                            {c.author?.nickname ?? '알 수 없음'}
                          </span>
                          <span className="text-[10.5px] text-zinc-400">{timeAgo(c.created_at)}</span>
                          {user?.id === c.author_id && (
                            <button
                              type="button"
                              onClick={() => removeComment(c.id)}
                              className="ml-auto text-[10.5px] font-semibold text-zinc-400 hover:text-rose-500"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                          {c.body}
                        </p>
                      </div>
                    </li>
                  ))}
                  {comments.length === 0 && (
                    <li className="py-6 text-center text-[12.5px] text-zinc-400">
                      첫 댓글을 남겨 보세요.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={addComment}
          className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] dark:border-white/10"
        >
          {profile ? (
            <Avatar name={profile.nickname} url={profile.avatar_url} size="sm" />
          ) : (
            <Avatar name="?" size="sm" />
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => {
              if (!user) openAuth('댓글을 쓰려면 로그인이 필요해요.');
            }}
            placeholder={profile ? '댓글을 남겨 보세요' : '로그인하고 댓글을 남겨 보세요'}
            className="field flex-1 rounded-full py-2.5 text-[13px]"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            aria-label="댓글 등록"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
