import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from './AuthContext';
import type { Board } from '../lib/types';

/** 글쓰기 폼에 미리 채워 넣을 내용 (예: 오늘 급식 메뉴) */
export interface UploadDraft {
  title?: string;
  body?: string;
  tags?: string[];
}

interface UIContextValue {
  /** 로그인 모달 */
  authOpen: boolean;
  authMessage?: string;
  openAuth: (message?: string) => void;
  closeAuth: () => void;
  /** 글쓰기 모달 */
  upload: { board: Board; draft?: UploadDraft } | null;
  openUpload: (board?: Board, draft?: UploadDraft) => void;
  closeUpload: () => void;
  /** 게시물 상세 모달 */
  postId: string | null;
  openPost: (id: string) => void;
  closePost: () => void;
  /** 데이터 변경 알림 (목록 새로고침 트리거) */
  dataVersion: number;
  bumpData: () => void;
  /** 로그인이 필요하면 모달을 열고 false 반환 */
  requireAuth: (message?: string, after?: () => void) => boolean;
  /** 로그인 성공 시 실행할 대기 동작 */
  pendingAfterAuth: (() => void) | null;
  clearPending: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | undefined>(undefined);
  const [upload, setUpload] = useState<{ board: Board; draft?: UploadDraft } | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [pending, setPending] = useState<(() => void) | null>(null);

  const openAuth = useCallback((message?: string) => {
    setAuthMessage(message);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => {
    setAuthOpen(false);
    setPending(null);
  }, []);

  const bumpData = useCallback(() => setDataVersion((v) => v + 1), []);

  const requireAuth = useCallback(
    (message?: string, after?: () => void) => {
      if (user) return true;
      setAuthMessage(message);
      setAuthOpen(true);
      if (after) setPending(() => after);
      return false;
    },
    [user],
  );

  const openUpload = useCallback(
    (board: Board = 'daily', draft?: UploadDraft) => {
      if (!user) {
        requireAuth('로그인하면 글과 사진을 올릴 수 있어요.', () => setUpload({ board, draft }));
        return;
      }
      setUpload({ board, draft });
    },
    [user, requireAuth],
  );

  const closeUpload = useCallback(() => setUpload(null), []);
  const openPost = useCallback((id: string) => setPostId(id), []);
  const closePost = useCallback(() => setPostId(null), []);

  const clearPending = useCallback(() => setPending(null), []);

  const value = useMemo<UIContextValue>(
    () => ({
      authOpen,
      authMessage,
      openAuth,
      closeAuth,
      upload,
      openUpload,
      closeUpload,
      postId,
      openPost,
      closePost,
      dataVersion,
      bumpData,
      requireAuth,
      pendingAfterAuth: pending,
      clearPending,
    }),
    [
      authOpen,
      authMessage,
      openAuth,
      closeAuth,
      upload,
      openUpload,
      closeUpload,
      postId,
      openPost,
      closePost,
      dataVersion,
      bumpData,
      requireAuth,
      pending,
      clearPending,
    ],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI는 UIProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
