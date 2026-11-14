import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Hash,
  ImagePlus,
  Loader2,
  Send,
  Trash2,
  UploadCloud,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useUI, type UploadMode } from '../context/UIContext';
import { backend } from '../lib/backend';
import { BOARDS, TAGS, type Board, type MediaType } from '../lib/types';
import { fileSizeLabel } from '../lib/format';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 60 * 1024 * 1024;

export function UploadModal({
  open,
  initialMode,
  initialBoard,
  onClose,
}: {
  open: boolean;
  initialMode: UploadMode;
  initialBoard: Board;
  onClose: () => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { bumpData } = useUI();

  const [mode, setMode] = useState<UploadMode>(initialMode);
  const [board, setBoard] = useState<Board>(initialBoard);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: MediaType } | null>(null);
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setBoard(initialBoard);
    setError(null);
  }, [open, initialMode, initialBoard]);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setCaption('');
    setTitle('');
    setBody('');
    setTags([]);
    setError(null);
    setBusy(false);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setPreview(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose, busy]);

  const accept = useMemo(() => 'image/*,video/*', []);

  if (!open) return null;

  const pickFile = (next: File | null) => {
    if (!next) return;
    const isVideo = next.type.startsWith('video');
    const isImage = next.type.startsWith('image');
    if (!isVideo && !isImage) {
      setError('사진 또는 영상 파일만 올릴 수 있어요.');
      return;
    }
    if (isVideo && next.size > MAX_VIDEO_BYTES) {
      setError(`영상은 ${fileSizeLabel(MAX_VIDEO_BYTES)} 이하만 올릴 수 있어요.`);
      return;
    }
    if (isImage && next.size > MAX_IMAGE_BYTES) {
      setError(`사진은 ${fileSizeLabel(MAX_IMAGE_BYTES)} 이하만 올릴 수 있어요.`);
      return;
    }
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(next);
    objectUrlRef.current = url;
    setFile(next);
    setPreview({ url, type: isVideo ? 'video' : 'image' });
    setError(null);
  };

  const clearFile = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= 3 ? prev : [...prev, tag],
    );
  };

  const submitMedia = async () => {
    if (!profile) return;
    if (!file) {
      setError('사진이나 짧은 영상을 먼저 선택해 주세요.');
      return;
    }
    if (!caption.trim()) {
      setError('한 줄 설명을 적어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uploaded = await backend.uploadMedia(file, profile.id);
      await backend.createPost(
        {
          kind: 'media',
          body: caption.trim(),
          title: null,
          board: null,
          media_url: uploaded.url,
          media_type: uploaded.type,
          tags,
        },
        profile,
      );
      bumpData();
      toast('쇼츠에 올렸어요!', 'success');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const submitPost = async () => {
    if (!profile) return;
    if (title.trim().length < 2) {
      setError('제목을 2자 이상 적어 주세요.');
      return;
    }
    if (body.trim().length < 2) {
      setError('내용을 2자 이상 적어 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      let media: { url: string; type: MediaType } | null = null;
      if (file) media = await backend.uploadMedia(file, profile.id);
      await backend.createPost(
        {
          kind: 'post',
          board,
          title: title.trim(),
          body: body.trim(),
          media_url: media?.url ?? null,
          media_type: media?.type ?? null,
          tags,
        },
        profile,
      );
      bumpData();
      toast('커뮤니티에 글을 올렸어요.', 'success');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '글을 올리지 못했어요.');
    } finally {
      setBusy(false);
    }
  };

  const submit = () => (mode === 'media' ? submitMedia() : submitPost());

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !busy && onClose()}
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm animate-fade-in"
      />
      <div className="relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-zinc-200 bg-white shadow-2xl animate-sheet-up sm:max-w-lg sm:rounded-3xl sm:animate-slide-up dark:border-white/10 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-[16px] font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {mode === 'media' ? '쇼츠 올리기' : '커뮤니티 글쓰기'}
            </h2>
            <p className="mt-0.5 text-[11.5px] text-zinc-500 dark:text-zinc-400">
              {mode === 'media' ? '사진 한 장, 짧은 영상 하나면 충분해요' : '우리 학교 친구들과 이야기를 나눠요'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="업로드 창 닫기"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 border-b border-zinc-100 px-4 py-2 dark:border-white/10">
          {(
            [
              { id: 'media' as UploadMode, label: '쇼츠 (사진·영상)', icon: <Video className="h-3.5 w-3.5" /> },
              { id: 'post' as UploadMode, label: '커뮤니티 글', icon: <Hash className="h-3.5 w-3.5" /> },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setMode(t.id);
                setError(null);
              }}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12.5px] font-bold transition ${
                mode === t.id
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                  : 'text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-white/5'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {mode === 'post' && (
            <div>
              <span className="label">게시판</span>
              <div className="flex flex-wrap gap-1.5">
                {BOARDS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBoard(b.id)}
                    className={`chip ${board === b.id ? 'chip-active' : ''}`}
                  >
                    <span aria-hidden>{b.emoji}</span>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 파일 선택 */}
          <div>
            <span className="label">
              {mode === 'media' ? '사진 · 짧은 영상' : '사진 첨부 (선택)'}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl bg-zinc-900">
                {preview.type === 'video' ? (
                  <video
                    src={preview.url}
                    controls
                    playsInline
                    muted
                    className="max-h-64 w-full object-contain"
                  />
                ) : (
                  <img
                    src={preview.url}
                    alt="업로드 미리보기"
                    className="max-h-64 w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-zinc-950/60 text-white backdrop-blur transition hover:bg-zinc-950/80"
                  aria-label="선택한 파일 제거"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <span className="absolute bottom-2 left-2 rounded-full bg-zinc-950/60 px-2.5 py-1 text-[10.5px] font-bold text-white backdrop-blur">
                  {file?.name} · {fileSizeLabel(file?.size ?? 0)}
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 transition ${
                  dragging
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-zinc-300 bg-zinc-50/60 hover:border-brand-400 hover:bg-brand-50/40 dark:border-white/15 dark:bg-white/5 dark:hover:border-brand-400'
                }`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-brand-600 shadow-sm dark:bg-zinc-800 dark:text-brand-300">
                  <UploadCloud className="h-5 w-5" />
                </span>
                <span className="text-[13px] font-bold text-zinc-700 dark:text-zinc-200">
                  눌러서 파일 선택
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  JPG · PNG · GIF · MP4 / 사진 10MB, 영상 60MB까지
                </span>
              </button>
            )}
          </div>

          {mode === 'post' ? (
            <>
              <div>
                <label className="label" htmlFor="post-title">
                  제목
                </label>
                <input
                  id="post-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={60}
                  placeholder="예: 이번 주 급식 메뉴 총정리"
                  className="field"
                />
                <p className="mt-1 text-right text-[10.5px] text-zinc-400">{title.length}/60</p>
              </div>
              <div>
                <label className="label" htmlFor="post-body">
                  내용
                </label>
                <textarea
                  id="post-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  placeholder="친구들에게 하고 싶은 이야기를 적어 주세요."
                  className="field resize-none leading-relaxed"
                />
                <p className="mt-1 text-right text-[10.5px] text-zinc-400">{body.length}/2000</p>
              </div>
            </>
          ) : (
            <div>
              <label className="label" htmlFor="media-caption">
                한 줄 설명
              </label>
              <textarea
                id="media-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                maxLength={200}
                placeholder="오늘의 순간을 한 줄로 남겨 보세요."
                className="field resize-none leading-relaxed"
              />
              <p className="mt-1 text-right text-[10.5px] text-zinc-400">{caption.length}/200</p>
            </div>
          )}

          <div>
            <span className="label">태그 (최대 3개)</span>
            <div className="flex flex-wrap gap-1.5">
              {TAGS.map((tag) => {
                const active = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`chip ${active ? 'chip-active' : ''}`}
                  >
                    {active ? <Check className="h-3 w-3" /> : <Hash className="h-3 w-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2.5 text-[12.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-zinc-100 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="hidden flex-1 items-center gap-1 text-[11px] text-zinc-400 sm:flex">
              <ImagePlus className="h-3.5 w-3.5" />
              올린 사진·영상은 피드에 바로 보여요
            </span>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="btn-primary ml-auto w-full py-3 text-[14px] sm:w-auto sm:px-6"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  올리는 중…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  {mode === 'media' ? '쇼츠 올리기' : '글 올리기'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
