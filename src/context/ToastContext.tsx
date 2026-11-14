import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, kind: ToastKind = 'info') => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex flex-col items-center gap-2 px-4 lg:bottom-8">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-zinc-200/80 bg-white/95 px-4 py-3 text-sm font-medium text-zinc-800 shadow-lg backdrop-blur animate-slide-up dark:border-white/10 dark:bg-zinc-900/95 dark:text-zinc-100"
          >
            <span className="mt-0.5 shrink-0">
              {t.kind === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : t.kind === 'error' ? (
                <XCircle className="h-4 w-4 text-rose-500" />
              ) : (
                <Info className="h-4 w-4 text-brand-500" />
              )}
            </span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              aria-label="알림 닫기"
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast는 ToastProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
