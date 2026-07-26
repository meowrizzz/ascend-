/* =========================================================
   Ascend — authentication service (ESM)
   Thin wrapper over Supabase Auth. The app never stores or
   sees the password itself — Supabase handles it.
   ========================================================= */
import { supabase, cloudConfigured } from './supabase-client.js';

const listeners = new Set();

// Where password-recovery links come back to (this exact page on GitHub Pages).
function redirectBase() {
  try { return location.href.split('#')[0].split('?')[0]; } catch { return location.origin; }
}

export const auth = {
  configured: cloudConfigured,

  async getSession() {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data.session || null;
  },
  // Race-free startup restore: wait for the client's authoritative INITIAL_SESSION
  // event (emitted after the persisted session is loaded and, if needed, refreshed),
  // with getSession() as a fallback. Avoids deciding "no session" before the client
  // has finished initializing.
  getInitialSession() {
    if (!supabase) return Promise.resolve(null);
    return new Promise((resolve) => {
      let done = false, sub = null;
      const finish = (s) => { if (done) return; done = true; try { sub && sub.unsubscribe(); } catch { /* ignore */ } resolve(s || null); };
      try {
        const { data } = supabase.auth.onAuthStateChange((event, sess) => {
          // onAuthStateChange replays INITIAL_SESSION to each new subscriber, so this
          // fires even if the client already initialized before we subscribed.
          if (event === 'INITIAL_SESSION') finish(sess);
          else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && sess) finish(sess);
        });
        sub = data && data.subscription;
      } catch { /* fall through to fallback */ }
      // Fallback: if the event never arrives, await getSession() (which also awaits init).
      setTimeout(() => { if (!done) supabase.auth.getSession().then(({ data }) => finish(data && data.session)).catch(() => finish(null)); }, 4000);
      setTimeout(() => finish(null), 12000);   // hard safety cap
    });
  },
  async getUser() {
    const s = await this.getSession();
    return s ? s.user : null;
  },
  // Returns { data, error }. If email confirmation is required, data.session is null until confirmed.
  // `displayName` is stored in user_metadata.display_name.
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
  async signOut() {
    if (!supabase) return { error: null };
    return supabase.auth.signOut();
  },
  async resetPassword(email) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectBase() });
  },
  // Re-send the sign-up confirmation email.
  async resendConfirmation(email) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectBase() } });
  },
  // Set a new password (used after a recovery link, or "change password").
  async updatePassword(password) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.updateUser({ password });
  },
  // Update the display name in user_metadata.
  async updateName(displayName) {
    if (!supabase) return { error: { message: 'cloud_not_configured' } };
    return supabase.auth.updateUser({ data: { display_name: displayName } });
  },
  onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    listeners.forEach(fn => { try { fn(event, session); } catch { /* ignore */ } });
  });
}
