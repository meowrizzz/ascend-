/* =========================================================
   Ascend — Supabase client (ESM, no build step)
   Loads @supabase/supabase-js v2 from a CDN and creates a
   single shared client. Session is persisted in localStorage
   so it survives page reloads.
   ========================================================= */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const cloudConfigured = !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = cloudConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,        // keep the session across reloads
        autoRefreshToken: true,
        detectSessionInUrl: true,    // handle password-recovery / confirmation links
        storageKey: 'ascend_sb_auth',
        // Pin the storage adapter so the session is always written to (and
        // restored from) localStorage — never silently falls back to memory.
        storage: (typeof window !== 'undefined' && window.localStorage) ? window.localStorage : undefined,
      },
    })
  : null;

// Table that stores one JSON blob per user (RLS-protected).
export const STATE_TABLE = 'user_states';
export const SCHEMA_VERSION = 3;
