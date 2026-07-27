/* =========================================================
   Ascend — authentication service (ESM)
   Thin wrapper over Supabase Auth. The app never stores or
   sees the password itself — Supabase handles it.

   DIAGNOSTIC BUILD: emits safe console logs (no tokens / email /
   session bodies) so a real F5 on production reveals exactly why
   the session is or isn't restored. Turn DIAG off to silence.
   ========================================================= */
import { supabase, cloudConfigured } from './supabase-client.js';

export const AUTH_BUILD = 'auth-delete-2026-07-27c';
const DIAG = true;                                   // safe, non-sensitive logging
const STORAGE_KEY = 'ascend_sb_auth';

function diag(...a) { if (DIAG) { try { console.info('[ascend-auth]', ...a); } catch { /* ignore */ } } }
const uid6 = s => { try { return (s && s.user && s.user.id) ? String(s.user.id).slice(0, 6) : '-'; } catch { return '-'; } };
export const hasStoredAuth = () => { try { return !!localStorage.getItem(STORAGE_KEY); } catch { return false; } };

if (typeof window !== 'undefined') window.__ASCEND_AUTH_BUILD__ = AUTH_BUILD;
diag('module loaded · build', AUTH_BUILD, '· storagePresent', hasStoredAuth(), '· configured', cloudConfigured);

const listeners = new Set();
function redirectBase() { try { return location.href.split('#')[0].split('?')[0]; } catch { return location.origin; } }

// Soft timeout: resolves to the sentinel instead of hanging/rejecting.
const TIMEOUT = Symbol('timeout');
function softTimeout(promise, ms) {
  return new Promise((resolve) => {
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; resolve(TIMEOUT); } }, ms);
    promise.then(v => { if (!done) { done = true; clearTimeout(t); resolve(v); } })
           .catch(() => { if (!done) { done = true; clearTimeout(t); resolve(null); } });
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function rawGetSession() { if (!supabase) return null; try { const { data } = await supabase.auth.getSession(); return data.session || null; } catch { return null; } }

export const auth = {
  configured: cloudConfigured,
  build: AUTH_BUILD,

  async getSession() { return rawGetSession(); },
  async getUser() { const s = await rawGetSession(); return s ? s.user : null; },

  /* Robust startup restore — the app's source of truth is the Supabase Auth
     API result, not a manual JSON.parse of the stored token.
       1) getSession() (awaits client init) — primary.
       2) if it returns null but a token IS stored, give the client a short
          window to finish loading/refresh and retry.
       3) server-validate via getUser() as a last resort.
       4) if still nothing but a token is stored (offline / init stalled),
          report `offlineWithStoredAuth` so the caller keeps the user in the
          app instead of forcing a re-login — and never clears storage.
     Returns { session } | { offlineWithStoredAuth:true } | { none:true } */
  async restoreSession() {
    if (!supabase) return { none: true };
    const stored = hasStoredAuth();
    diag('restore: start · storagePresent', stored);

    let s = await softTimeout(rawGetSession(), 3000);
    diag('restore: getSession#1 · present', !!(s && s !== TIMEOUT), '· timedOut', s === TIMEOUT, '· uid', uid6(s === TIMEOUT ? null : s));
    if (s && s !== TIMEOUT) return { session: s };

    if (!stored) { diag('restore: no stored token → none'); return { none: true }; }

    for (let i = 0; i < 5; i++) {
      await sleep(600);
      s = await softTimeout(rawGetSession(), 3000);
      diag('restore: getSession retry', i + 1, '· present', !!(s && s !== TIMEOUT));
      if (s && s !== TIMEOUT) return { session: s };
    }

    try {
      const u = await softTimeout(supabase.auth.getUser(), 4000);
      const ok = u && u !== TIMEOUT && u.data && u.data.user;
      diag('restore: getUser · valid', !!ok);
      if (ok) { const s2 = await softTimeout(rawGetSession(), 3000); if (s2 && s2 !== TIMEOUT) return { session: s2 }; }
    } catch { /* ignore */ }

    // If the token was CLEARED during restore, the client performed a genuine
    // sign-out (e.g. refresh_token rejected) → treat as logged out.
    if (!hasStoredAuth()) { diag('restore: token cleared during restore → none (real sign-out)'); return { none: true }; }

    // Token still present but could not be verified (offline / client init stalled).
    // Keep the user in the app; never clear the stored session here.
    diag('restore: stored token unverified but present → keep app, reconnect later');
    return { offlineWithStoredAuth: true };
  },

  async signUp(email, password, displayName) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    const options = { emailRedirectTo: redirectBase() };
    if (displayName) options.data = { display_name: displayName };
    return supabase.auth.signUp({ email, password, options });
  },
  async signIn(email, password) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.signInWithPassword({ email, password });
  },
  // Wrapped so we can see WHO/what triggers a sign-out (stack trace, no secrets).
  async signOut() {
    diag('signOut() CALLED · from:', (new Error().stack || '').split('\n').slice(1, 4).map(l => l.trim()).join(' | '));
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  },
  async resetPassword(email) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectBase() });
  },
  async resendConfirmation(email) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectBase() } });
  },
  async updatePassword(password) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.updateUser({ password });
  },
  async updateName(displayName) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.updateUser({ data: { display_name: displayName } });
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

// Single global auth listener → fan out to app modules (+ diagnostic log).
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    diag('event:', event, '· session', !!session, '· uid', uid6(session));
    listeners.forEach(fn => { try { fn(event, session); } catch { /* ignore */ } });
  });
}
