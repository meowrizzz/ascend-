/* =========================================================
   Ascend — auth gate (ESM)
   Decides, before the app is shown, whether to display the
   main UI (session / local mode) or the full-screen auth
   screen. Guarantees no flash of the app during the check.
   ========================================================= */
window.__ascendGate = true;                 // tells app.js the gate controls boot

import { auth } from './auth.js';
import { AuthUI } from './auth-ui.js';

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

const timeout = ms => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));

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
  let session = null, errored = false;
  // getSession() reads the persisted session from localStorage (and refreshes if
  // needed). Give it a generous timeout so a slow refresh doesn't misfire, but
  // never reject-race a fast local read.
  try { session = await Promise.race([auth.getSession(), timeout(8000)]); }
  catch { errored = true; }

  if (session) { onAuthedSession(session); return; }
  if (errored) { ui.show('offline'); return; }
  if (localStorage.getItem(LOCAL_FLAG)) { enterApp(); return; }  // user explicitly chose local
  ui.show('login');                                             // no session → auth screen is the entry point
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
  if (event === 'SIGNED_OUT') { entered = false; try { localStorage.removeItem(LOCAL_FLAG); } catch { /* ignore */ } showAuth('login'); }
});

window.AscendGate = { showAuth, enterLocal, enterApp, isLocal: () => { try { return !!localStorage.getItem(LOCAL_FLAG); } catch { return false; } } };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
else start();
