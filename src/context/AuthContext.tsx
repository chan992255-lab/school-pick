import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { backend } from '../lib/backend';
import type { AuthUser, Profile, SignUpInput } from '../lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<{ needsEmailConfirm: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (nextUser: AuthUser | null) => {
    if (!nextUser) {
      setProfile(null);
      return;
    }
    try {
      const next = await backend.getProfile(nextUser.id);
      setProfile(next);
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    backend
      .getSession()
      .then(async (session) => {
        if (!alive) return;
        setUser(session);
        await loadProfile(session);
      })
      .catch(() => {
        /* 세션 조회 실패 시 비로그인 상태로 시작 */
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    const unsubscribe = backend.onAuthStateChange((nextUser) => {
      if (!alive) return;
      setUser(nextUser);
      void loadProfile(nextUser);
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const nextUser = await backend.signIn(email, password);
    setUser(nextUser);
    const nextProfile = await backend.getProfile(nextUser.id);
    setProfile(nextProfile);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const result = await backend.signUp(input);
    if (result.user && !result.needsEmailConfirm) {
      setUser(result.user);
      setProfile(await backend.getProfile(result.user.id));
    }
    return { needsEmailConfirm: result.needsEmailConfirm };
  }, []);

  const signOut = useCallback(async () => {
    await backend.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, loading, signIn, signUp, signOut, refreshProfile, setProfile }),
    [user, profile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  return ctx;
}
