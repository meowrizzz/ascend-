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
