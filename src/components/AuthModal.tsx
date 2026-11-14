import { useEffect, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, GraduationCap, Loader2, Lock, Mail, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isDemoMode } from '../lib/backend';

type Mode = 'signin' | 'signup';

export function AuthModal({
  open,
  message,
  onClose,
  onSuccess,
}: {
  open: boolean;
  message?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setInfo(null);
    setBusy(false);
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('올바른 이메일 주소를 입력해 주세요.');
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상으로 입력해 주세요.');
      return;
    }
    if (mode === 'signup') {
      if (nickname.trim().length < 2) {
        setError('닉네임은 2자 이상 입력해 주세요.');
        return;
      }
      if (!school.trim()) {
        setError('학교 이름을 입력해 주세요.');
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
        toast('로그인했어요. 반가워요!', 'success');
        onSuccess();
      } else {
        const result = await signUp({
          email: email.trim(),
          password,
          nickname: nickname.trim(),
          school: school.trim(),
          grade,
        });
        if (result.needsEmailConfirm) {
          setInfo('가입 요청을 보냈어요. 메일함에서 인증 링크를 누른 뒤 로그인해 주세요.');
        } else {
          toast(`${nickname.trim()}님, 환영해요!`, 'success');
          onSuccess();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async () => {
    setError(null);
    setBusy(true);
    try {
      await signIn('seoyeon@demo.kr', 'demo1234');
      toast('데모 계정으로 로그인했어요.', 'success');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : '데모 로그인에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm animate-fade-in"
      />
      <div className="relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white p-5 shadow-2xl animate-sheet-up sm:max-w-md sm:rounded-3xl sm:animate-slide-up dark:border-white/10 dark:bg-zinc-900">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-widest text-brand-500">SCHOOL PICK</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
              {mode === 'signin' ? '다시 만나서 반가워요' : '스쿨픽 시작하기'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="로그인 창 닫기"
            className="grid h-9 w-9 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {message && (
          <p className="mb-4 rounded-2xl bg-brand-50 px-4 py-3 text-[13px] font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
            {message}
          </p>
        )}

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-zinc-100 p-1 dark:bg-white/5">
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-xl py-2 text-[13.5px] font-bold transition ${
                mode === m
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
              }`}
            >
              {m === 'signin' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="label" htmlFor="auth-email">
              이메일
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@school.kr"
                className="field pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="auth-password">
              비밀번호
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="auth-password"
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6자 이상"
                className="field pl-10"
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div>
                <label className="label" htmlFor="auth-nickname">
                  닉네임
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="auth-nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.slice(0, 12))}
                    placeholder="친구들이 부르는 이름"
                    className="field pl-10"
                    maxLength={12}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="auth-school">
                  학교
                </label>
                <div className="relative">
                  <GraduationCap className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="auth-school"
                    value={school}
                    onChange={(e) => setSchool(e.target.value.slice(0, 30))}
                    placeholder="예: 한빛고등학교"
                    className="field pl-10"
                    maxLength={30}
                    required
                  />
                </div>
              </div>

              <div>
                <span className="label">학년</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 3].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g)}
                      className={`rounded-2xl border py-2.5 text-[14px] font-bold transition ${
                        grade === g
                          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
                          : 'border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-white/10 dark:text-zinc-400'
                      }`}
                    >
                      {g}학년
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2.5 text-[12.5px] font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-[12.5px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              {info}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-[14.5px]">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === 'signin' ? '로그인' : '가입하고 시작하기'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {isDemoMode && (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-300 p-3 dark:border-white/15">
            <p className="text-[11.5px] font-semibold text-zinc-500 dark:text-zinc-400">
              Supabase가 연결되지 않은 데모 모드예요. 아래 계정으로 바로 둘러볼 수 있어요.
            </p>
            <button
              type="button"
              onClick={demoLogin}
              disabled={busy}
              className="btn-soft mt-2 w-full py-2 text-[12.5px]"
            >
              데모 계정으로 둘러보기 (서연 · 한빛고 2학년)
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-[11px] leading-relaxed text-zinc-400">
          고등학생을 위한 공간이에요. 서로를 존중하는 말로 함께해 주세요.
        </p>
      </div>
    </div>
  );
}
