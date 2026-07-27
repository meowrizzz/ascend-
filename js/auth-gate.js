/* =========================================================
   Ascend — auth gate (ESM)
   Decides, before the app is shown, whether to display the
   main UI (session / local mode) or the full-screen auth
   screen. Guarantees no flash of the app during the check.
   ========================================================= */
window.__ascendGate = true;                 // tells app.js the gate controls boot

import { auth, hasStoredAuth, AUTH_BUILD } from './auth.js';
import { AuthUI } from './auth-ui.js';

const gdiag = (...a) => { try { console.info('[ascend-gate]', ...a); } catch { /* ignore */ } };
const LOCAL_FLAG = 'ascend_local_mode';
const authRoot = () => document.getElementById('auth-root');
const appEl = () => document.getElementById('app');
const markActive = () => { window.__ascendGateActive = true; };
let entered = false, ui = null;

function enterApp() {
  markActive();
  if (!entered) { entered = true; try { window.AscendApp && window.AscendApp.boot(); } catch (e) { console.warn('[ascend gate] boot failed'); } }
  appEl() && appEl().classList.remove('gated');
  authRoot() && authRoot().classList.add('hidden');
}
function enterLocal() { try { localStorage.setItem(LOCAL_FLAG, '1'); } catch { /* ignore */ } enterApp(); }
function showAuth(mode) { markActive(); entered = entered && false; appEl() && appEl().classList.add('gated'); authRoot() && authRoot().classList.remove('hidden'); ui.show(mode || 'login'); }

async function start() {
  markActive();
  ui = new AuthUI(authRoot(), {
    onLocal: () => enterLocal(),
    onRetry: () => { ui.show('loading'); start(); },
    onAuthed: () => { auth.getSession().then(s => { enterApp(); if (s) window.AscendCloud && window.AscendCloud.beginSync(s); }); },
  });

  if (!auth.configured) { enterLocal(); return; }              // no keys → local only

  // Returning via a password-recovery link → show the reset form, never the app.
  const recovery = /type=recovery/.test((location.hash || '') + (location.search || ''));
  if (recovery) { ui.show('reset'); return; }

  ui.show('loading');
  // Source of truth = Supabase Auth API result (getSession → grace retry → getUser),
  // NOT a manual token parse and NOT a fragile INITIAL_SESSION wait.
  const r = await auth.restoreSession();
  if (r.session) { gdiag('decision: APP (valid session)'); onAuthedSession(r.session); return; }
  if (r.offlineWithStoredAuth) {
    // A token is stored but couldn't be verified (offline / init stalled). Do NOT
    // force re-login and do NOT clear storage — keep the user in the app. When the
    // client later emits a session, onChange → onAuthedSession starts sync.
    gdiag('decision: APP (stored token, unverified — will reconnect)');
    markActive(); enterApp(); return;
  }
  if (localStorage.getItem(LOCAL_FLAG)) { gdiag('decision: APP (local mode)'); enterApp(); return; }
  gdiag('decision: LOGIN (no session, no stored token)');
  ui.show('login');
}

// A live session exists: this is account mode, so drop any stale "local only"
// flag — otherwise a later session hiccup would silently fall back to local.
function onAuthedSession(sess) {
  try { localStorage.removeItem(LOCAL_FLAG); } catch { /* ignore */ }
  enterApp();
  window.AscendCloud && window.AscendCloud.beginSync(sess);
}

// React to auth changes after startup.
auth.onChange((event, sess) => {
  if (event === 'PASSWORD_RECOVERY') { showAuth(); ui.show('reset'); return; }
  if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') && sess) { onAuthedSession(sess); return; }
  if (event === 'SIGNED_OUT') {
    // Only treat as a real sign-out if the client actually cleared the stored token.
    // A transient background-refresh failure must NOT kick the user to login.
    if (hasStoredAuth()) { gdiag('SIGNED_OUT but token still stored → treat as transient, keep app'); return; }
    gdiag('SIGNED_OUT (token cleared) → login');
    entered = false; try { localStorage.removeItem(LOCAL_FLAG); } catch { /* ignore */ } showAuth('login');
  }
});

window.AscendGate = { showAuth, enterLocal, enterApp, isLocal: () => { try { return !!localStorage.getItem(LOCAL_FLAG); } catch { return false; } } };
gdiag('gate loaded · build', AUTH_BUILD);

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
