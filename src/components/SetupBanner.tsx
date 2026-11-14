import { useState } from 'react';
import { ChevronDown, Database, ExternalLink, Sparkles, X } from 'lucide-react';
import { isDemoMode } from '../lib/backend';
import { useToast } from '../context/ToastContext';

const DISMISS_KEY = 'schoolpick.setupBanner.dismissed';

const ENV_SNIPPET = `VITE_SUPABASE_URL=https://<프로젝트>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key>`;

export function SetupBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  if (!isDemoMode || dismissed) return null;

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(ENV_SNIPPET);
      toast('환경변수 예시를 복사했어요. .env 파일에 붙여넣어 주세요.', 'success');
    } catch {
      toast('.env 파일에 직접 입력해 주세요.', 'info');
    }
  };

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* 무시 */
    }
  };

  return (
    <div className="mx-auto mb-4 w-full max-w-5xl px-4 lg:px-0">
      <div className="overflow-hidden rounded-2xl border border-amber-300/70 bg-amber-50/90 dark:border-amber-400/25 dark:bg-amber-400/10">
        <div className="flex items-start gap-3 px-4 py-3">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400/25 text-amber-700 dark:text-amber-300">
            <Database className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-amber-900 dark:text-amber-200">
              데모 모드로 실행 중이에요
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-amber-800/90 dark:text-amber-200/80">
              지금 올린 글·사진은 이 브라우저에만 저장됩니다. Supabase 환경변수를 연결하면 실제
              회원가입·로그인과 클라우드 저장이 켜집니다.
            </p>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-bold text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
            >
              연결 방법 보기
              <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <button
            type="button"
            aria-label="설정 안내 닫기"
            onClick={dismiss}
            className="text-amber-700/70 transition hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {open && (
          <div className="border-t border-amber-300/60 px-4 py-4 text-[12.5px] leading-relaxed text-amber-900 dark:border-amber-400/20 dark:text-amber-100/90">
            <ol className="list-decimal space-y-2 pl-5 font-medium">
              <li>
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold underline underline-offset-2"
                >
                  Supabase 대시보드 <ExternalLink className="h-3 w-3" />
                </a>
                에서 새 프로젝트를 만듭니다.
              </li>
              <li>
                프로젝트의 <b>SQL Editor</b>를 열고 이 저장소의{' '}
                <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-[11.5px] dark:bg-amber-400/20">
                  supabase/schema.sql
                </code>{' '}
                전체를 붙여넣고 실행합니다. (테이블·RLS·media 버킷이 한 번에 생성됩니다)
              </li>
              <li>
                <b>Project Settings → API</b>에서 Project URL과 anon public key를 복사해 프로젝트
                루트의 <code className="font-mono text-[11.5px]">.env</code>에 넣습니다.
                <div className="mt-2 flex items-start gap-2">
                  <pre className="flex-1 overflow-x-auto rounded-xl bg-amber-900/10 p-3 font-mono text-[11px] leading-relaxed text-amber-950 dark:bg-black/30 dark:text-amber-100">
                    {ENV_SNIPPET}
                  </pre>
                  <button
                    type="button"
                    onClick={copySnippet}
                    className="shrink-0 rounded-lg bg-amber-900/10 px-2.5 py-1.5 text-[11px] font-bold hover:bg-amber-900/20 dark:bg-white/10 dark:hover:bg-white/20"
                  >
                    복사
                  </button>
                </div>
              </li>
              <li>
                <code className="font-mono text-[11.5px]">npm run dev</code>를 다시 시작하면 실제
                백엔드로 연결됩니다.
              </li>
            </ol>
            <p className="mt-3 flex items-start gap-1.5 text-[11.5px] font-semibold opacity-80">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              데모 모드에서도 회원가입·글쓰기·좋아요·댓글·북마크·사진 첨부 흐름을 그대로
              체험할 수 있어요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
