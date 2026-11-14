import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

/**
 * 환경변수가 없으면 null. 앱은 데모 모드로 정상 동작한다.
 */
export const isSupabaseConfigured =
  rawUrl.length > 0 && rawKey.length > 0 && /^https?:\/\//.test(rawUrl);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const supabaseUrl = rawUrl;
