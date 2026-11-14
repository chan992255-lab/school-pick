import { demoBackend } from './demo';
import { isSupabaseConfigured, supabaseUrl } from './supabase';
import { supabaseBackend } from './supabase-backend';
import type { Backend } from './types';

/**
 * Supabase 환경변수가 있으면 실제 백엔드, 없으면 데모 백엔드.
 */
export const backend: Backend = isSupabaseConfigured ? supabaseBackend : demoBackend;
export const isDemoMode = backend.mode === 'demo';
export { isSupabaseConfigured, supabaseUrl };
