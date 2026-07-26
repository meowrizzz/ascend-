/* =========================================================
   Ascend — cloud sync (ESM)
   Local-first: every action saves to localStorage and the UI
   updates immediately; the cloud write is queued and sent with
   a 1500ms debounce. Conflicts are detected by the DB `revision`
   (bumped by a BEFORE UPDATE trigger) — never a silent
   last-write-wins. The app works fully without login.

   The auth GATE (auth-gate.js) owns the startup screen; this
   module owns synchronisation + the in-profile account block and
   is driven by AscendCloud.beginSync(session).

   Privacy: never logs state_json, journal text or private habit
   names. user_id always comes from session.user.id.
   ========================================================= */
import { supabase, cloudConfigured, STATE_TABLE, SCHEMA_VERSION } from './supabase-client.js';
import { auth } from './auth.js';

const App = () => window.AscendApp;
const META_KEY = 'ascend_sync_meta';
const BACKUP_KEY = 'ascend_local_backup';
const DEBOUNCE_MS = 1500;

let session = null, uid = null;
let status = 'local', paused = false, dirty = false, pushTimer = null, accountCard = null;

const STR = {
  ru: {
    localProfile: 'Локальный профиль', localNoSync: 'Синхронизация между устройствами недоступна',
    signInOrUp: 'Создать аккаунт или войти', noName: 'Имя не указано — добавьте его',
    syncStatus: 'Статус синхронизации', changeName: 'Изменить имя', changePass: 'Изменить пароль',
    syncNow: 'Синхронизировать сейчас', signOut: 'Выйти', resolve: 'Разрешить конфликт',
    nameLabel: 'Имя', save: 'Сохранить', newPass: 'Новый пароль', confirmPass: 'Повторите пароль',
    nameBad: 'Имя от 2 до 40 символов', passBad: 'Пароль не короче 6 символов', passMismatch: 'Пароли не совпадают',
    nameSaved: 'Имя обновлено', passSaved: 'Пароль обновлён',
    'status.local': 'Только на устройстве', 'status.connecting': 'Подключение…', 'status.syncing': 'Синхронизация…',
    'status.synced': 'Синхронизировано', 'status.offline': 'Нет сети, сохранено локально',
    'status.conflict': 'Конфликт данных', 'status.error': 'Ошибка синхронизации',
    recA_title: 'В облаке пока нет данных', recA_body: 'Загрузить ваш локальный прогресс в облако?',
    recA_up: 'Сохранить в облако', recA_only: 'Только локально',
    recB_title: 'В облаке есть ваши данные', recB_body: 'Загрузить облачные данные на это устройство?',
    recB_load: 'Загрузить из облака', recB_cancel: 'Отмена',
    recC_title: 'Данные есть и локально, и в облаке', recC_body: 'Ничего не перезапишется автоматически. Выберите версию.',
    recC_cloud: 'Использовать облачную', recC_local: 'Заменить облако локальной', recC_cancel: 'Отмена',
    conflict_title: 'Обнаружен конфликт данных', conflict_body: 'На другом устройстве данные изменились. Выберите версию.',
    conflict_load: 'Загрузить облачную', conflict_force: 'Заменить облако локальной',
    invalidCloud: 'Облачные данные повреждены и не были загружены', backupNote: 'Локальная копия сохранена в резерв',
  },
  en: {
    localProfile: 'Local profile', localNoSync: 'Cross-device sync is unavailable',
    signInOrUp: 'Create account or sign in', noName: 'No name set — add one',
    syncStatus: 'Sync status', changeName: 'Change name', changePass: 'Change password',
    syncNow: 'Sync now', signOut: 'Sign out', resolve: 'Resolve conflict',
    nameLabel: 'Name', save: 'Save', newPass: 'New password', confirmPass: 'Repeat password',
    nameBad: 'Name must be 2–40 characters', passBad: 'Password must be at least 6 characters', passMismatch: 'Passwords do not match',
    nameSaved: 'Name updated', passSaved: 'Password updated',
    'status.local': 'On this device only', 'status.connecting': 'Connecting…', 'status.syncing': 'Syncing…',
    'status.synced': 'Synced', 'status.offline': 'Offline, saved locally',
    'status.conflict': 'Data conflict', 'status.error': 'Sync error',
    recA_title: 'No data in the cloud yet', recA_body: 'Upload your local progress to the cloud?',
    recA_up: 'Save to cloud', recA_only: 'Local only',
    recB_title: 'You have cloud data', recB_body: 'Load your cloud data onto this device?',
    recB_load: 'Load from cloud', recB_cancel: 'Cancel',
    recC_title: 'Data exists both locally and in the cloud', recC_body: 'Nothing is overwritten automatically. Choose a version.',
    recC_cloud: 'Use cloud version', recC_local: 'Replace cloud with local', recC_cancel: 'Cancel',
    conflict_title: 'Data conflict detected', conflict_body: 'Data changed on another device. Choose a version.',
    conflict_load: 'Load cloud version', conflict_force: 'Replace cloud with local',
    invalidCloud: 'Cloud data is corrupted and was not loaded', backupNote: 'A local backup was saved',
  },
};
const T = k => { const l = App() && App().ui.getLang() || 'ru'; return (STR[l] && STR[l][k]) || STR.ru[k] || k; };
const esc = s => App().ui.esc(s);

const loadMeta = () => { try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; } catch { return {}; } };
const saveMeta = m => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* ignore */ } };
const patchMeta = f => saveMeta({ ...loadMeta(), ...f });   // update fields without dropping others
let _syncedUid = null;                                       // guards double reconciliation per session
function backupLocal() { try { const raw = localStorage.getItem(App().KEY); if (raw) localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), data: raw })); } catch { /* ignore */ } }

function setStatus(s) { status = s; renderAccount(); }
const statusLabel = () => T('status.' + status);
const shortErr = e => (e && (e.code || e.status || (e.message || '').slice(0, 60))) || 'unknown';
const isNetworkError = e => !navigator.onLine || /fetch|network|Failed to fetch|timeout/i.test(e && e.message || '');
const displayName = () => { try { return (session && session.user && session.user.user_metadata && session.user.user_metadata.display_name) || ''; } catch { return ''; } };

async function fetchRow() {
  const { data, error } = await supabase.from(STATE_TABLE).select('state_json, revision, updated_at').eq('user_id', uid).maybeSingle();
  if (error) throw error;
  return data || null;
}
function applyCloud(row) {
  const migrated = App().migrate(row.state_json);
  if (!App().validate(migrated)) { setStatus('error'); App().ui.toast('info', '⚠️', T('invalidCloud'), ''); return false; }
  backupLocal();
  App().setState(migrated); App().saveLocalOnly(); App().reconcile();
  saveMeta({ userId: uid, revision: row.revision, updatedAt: row.updated_at, status: 'synced', pendingLocal: false });
  paused = false; dirty = false; setStatus('synced'); App().render();
  return true;
}
async function pushNow() {
  if (!session || paused) return;
  setStatus('syncing');
  try {
    const { data: cur, error: selErr } = await supabase.from(STATE_TABLE).select('revision').eq('user_id', uid).maybeSingle();
    if (selErr) throw selErr;
    const meta = loadMeta();
    if (cur && typeof meta.revision === 'number' && cur.revision > meta.revision) { setStatus('conflict'); return; }
    const { data, error } = await supabase.from(STATE_TABLE)
      .upsert({ user_id: uid, state_json: App().getState(), schema_version: SCHEMA_VERSION }, { onConflict: 'user_id' })
      .select('revision, updated_at').single();
    if (error) throw error;
    saveMeta({ userId: uid, revision: data.revision, updatedAt: data.updated_at, status: 'synced', pendingLocal: false });
    dirty = false; setStatus('synced');
  } catch (e) {
    if (isNetworkError(e)) setStatus('offline'); else setStatus('error');
    console.warn('[ascend cloud] push failed:', shortErr(e));
  }
}
function queuePush() {
  if (!session || paused) return;
  dirty = true; patchMeta({ pendingLocal: true });   // remember there is an unsynced local change (survives reload)
  if (pushTimer) clearTimeout(pushTimer);
  setStatus('syncing');
  pushTimer = setTimeout(() => { pushTimer = null; pushNow(); }, DEBOUNCE_MS);
}

/* ---- reconciliation (A/B/C) ---- */
async function reconcileFirstConnect() {
  setStatus('connecting');
  let row;
  try { row = await fetchRow(); } catch (e) { if (isNetworkError(e)) setStatus('offline'); else setStatus('error'); console.warn('[ascend cloud] fetch failed:', shortErr(e)); return; }
  const localHas = App().hasMeaningfulProgress(), cloudHas = !!row;
  if (!cloudHas && !localHas) { paused = false; await pushNow(); return; }
  if (!cloudHas && localHas) return scenarioA();
  if (cloudHas && !localHas) return scenarioB(row);
  return scenarioC(row);
}
function scenarioA() {
  App().ui.openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(T('recA_title'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(T('recA_body'))}</p>
    <div class="row mt24"><button class="btn btn--ghost" id="rc-only">${esc(T('recA_only'))}</button><button class="btn btn--primary" id="rc-up">${esc(T('recA_up'))}</button></div>`);
  document.getElementById('rc-up').onclick = () => { App().ui.closeModal(); paused = false; pushNow(); };
  document.getElementById('rc-only').onclick = () => { App().ui.closeModal(); paused = true; setStatus('local'); };
}
function scenarioB(row) {
  App().ui.openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(T('recB_title'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(T('recB_body'))}</p>
    <div class="row mt24"><button class="btn btn--ghost" id="rc-cancel">${esc(T('recB_cancel'))}</button><button class="btn btn--blue" id="rc-load">${esc(T('recB_load'))}</button></div>`);
  document.getElementById('rc-load').onclick = () => { App().ui.closeModal(); applyCloud(row); App().ui.toast('info', '💾', T('backupNote'), ''); };
  document.getElementById('rc-cancel').onclick = () => { App().ui.closeModal(); paused = true; setStatus('local'); };
}
function scenarioC(row) {
  App().ui.openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${esc(T('recC_title'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(T('recC_body'))}</p>
    <button class="btn btn--blue btn--block mt16" id="rc-cloud">${esc(T('recC_cloud'))}</button>
    <button class="btn btn--danger btn--block mt12" id="rc-local">${esc(T('recC_local'))}</button>
    <button class="btn btn--ghost btn--block mt12" id="rc-cancel">${esc(T('recC_cancel'))}</button>`);
  document.getElementById('rc-cloud').onclick = () => { App().ui.closeModal(); applyCloud(row); App().ui.toast('info', '💾', T('backupNote'), ''); };
  document.getElementById('rc-local').onclick = () => { App().ui.closeModal(); backupLocal(); saveMeta({ userId: uid, revision: row.revision, updatedAt: row.updated_at, status: 'syncing' }); paused = false; pushNow(); };
  document.getElementById('rc-cancel').onclick = () => { App().ui.closeModal(); paused = true; setStatus('local'); };
}
async function showConflict() {
  let row = null; try { row = await fetchRow(); } catch { /* ignore */ }
  App().ui.openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(T('conflict_title'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(T('conflict_body'))}</p>
    <div class="row mt24"><button class="btn btn--blue" id="cf-load">${esc(T('conflict_load'))}</button><button class="btn btn--danger" id="cf-force">${esc(T('conflict_force'))}</button></div>`);
  document.getElementById('cf-load').onclick = () => { App().ui.closeModal(); if (row) applyCloud(row); };
  document.getElementById('cf-force').onclick = async () => {
    App().ui.closeModal(); backupLocal();
    try { const { data } = await supabase.from(STATE_TABLE).select('revision').eq('user_id', uid).maybeSingle(); if (data) saveMeta({ ...loadMeta(), revision: data.revision }); } catch { /* ignore */ }
    paused = false; pushNow();
  };
}
// Returning device: compare the server revision to what we last synced.
//  • server == local baseline           → nothing changed, synced.
//  • server newer & no local edits       → cloud is simply ahead → load it (NOT a conflict).
//  • server newer & we have local edits  → both sides changed → real conflict.
async function backgroundCheck() {
  try {
    const row = await fetchRow();
    const meta = loadMeta();
    if (!row) { if (App().hasMeaningfulProgress()) { paused = false; pushNow(); } return; }
    if (typeof meta.revision !== 'number') return;              // unknown baseline → leave as-is
    if (row.revision > meta.revision) {
      if (meta.pendingLocal) setStatus('conflict');            // genuine divergence
      else applyCloud(row);                                    // cloud ahead, local clean → pull it in
    } else {
      setStatus('synced');
    }
  } catch (e) { if (isNetworkError(e)) setStatus('offline'); }
}

/* ---- driven by the gate ---- */
function beginSync(sess) {
  session = sess; uid = sess.user.id;
  renderAccount(); App().refreshProfile();
  if (_syncedUid === uid) return;                 // gate may signal the session more than once — reconcile only once
  _syncedUid = uid;
  const meta = loadMeta();
  if (meta.userId === uid) { setStatus('synced'); backgroundCheck(); } else { reconcileFirstConnect(); }
}
async function handleLocalWipe() { try { await auth.signOut(); } catch { /* ignore */ } saveMeta({}); session = null; uid = null; _syncedUid = null; status = 'local'; }

/* ---- account card in Profile ---- */
function mountAccount(card) { accountCard = card; renderAccount(); }
function renderAccount() {
  if (!accountCard) return;
  if (!auth.configured) { accountCard.style.display = 'none'; return; }
  accountCard.style.display = '';
  if (!session) {
    accountCard.innerHTML =
      `<div class="list-item" style="cursor:default"><div class="li-ico">📱</div><div class="li-body"><div class="li-ttl">${esc(T('localProfile'))}</div><div class="li-sub">${esc(T('localNoSync'))}</div></div></div>` +
      `<div class="list-item" id="ac-signin"><div class="li-ico">☁️</div><div class="li-body"><div class="li-ttl">${esc(T('signInOrUp'))}</div></div><div class="li-arrow">›</div></div>`;
    accountCard.querySelector('#ac-signin').onclick = () => { if (window.AscendGate) window.AscendGate.showAuth('login'); };
    return;
  }
  const name = displayName();
  accountCard.innerHTML =
    `<div class="list-item acc-name-row" style="cursor:default"><div class="li-ico">👤</div><div class="li-body"><div class="li-ttl">${esc(name || T('noName'))}</div><div class="li-sub">${esc(session.user.email || '')}</div></div></div>` +
    `<div class="list-item" style="cursor:default"><div class="li-ico">🔄</div><div class="li-body"><div class="li-ttl">${esc(T('syncStatus'))}</div><div class="li-sub">${esc(statusLabel())}</div></div></div>` +
    (status === 'conflict' ? `<div class="list-item" id="ac-resolve"><div class="li-ico">⚠️</div><div class="li-body"><div class="li-ttl" style="color:var(--amber)">${esc(T('resolve'))}</div></div><div class="li-arrow">›</div></div>` : '') +
    `<div class="list-item" id="ac-name"><div class="li-ico">✏️</div><div class="li-body"><div class="li-ttl">${esc(T('changeName'))}</div></div><div class="li-arrow">›</div></div>` +
    `<div class="list-item" id="ac-pass"><div class="li-ico">🔑</div><div class="li-body"><div class="li-ttl">${esc(T('changePass'))}</div></div><div class="li-arrow">›</div></div>` +
    `<div class="list-item" id="ac-sync"><div class="li-ico">⬆️</div><div class="li-body"><div class="li-ttl">${esc(T('syncNow'))}</div></div><div class="li-arrow">›</div></div>` +
    `<div class="list-item" id="ac-signout"><div class="li-ico">🚪</div><div class="li-body"><div class="li-ttl" style="color:var(--red)">${esc(T('signOut'))}</div></div><div class="li-arrow">›</div></div>`;
  accountCard.querySelector('#ac-resolve') && (accountCard.querySelector('#ac-resolve').onclick = showConflict);
  accountCard.querySelector('#ac-name').onclick = openNameDialog;
  accountCard.querySelector('#ac-pass').onclick = openPassDialog;
  accountCard.querySelector('#ac-sync').onclick = () => { paused = false; pushNow(); };
  accountCard.querySelector('#ac-signout').onclick = doSignOut;
}
function openNameDialog() {
  App().ui.openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(T('changeName'))}</h2><button class="modal__close" data-close>×</button></div>
    <div class="field"><label>${esc(T('nameLabel'))}</label><input class="input" id="an-name" type="text" maxlength="40" value="${esc(displayName())}"></div>
    <div class="auth-msg" id="an-msg"></div>
    <button class="btn btn--primary btn--block mt16" id="an-save">${esc(T('save'))}</button>`);
  const msg = t => { const m = document.getElementById('an-msg'); if (m) m.textContent = t || ''; };
  document.getElementById('an-save').onclick = async () => {
    const name = (document.getElementById('an-name').value || '').trim();
    if (name.length < 2 || name.length > 40) { msg(T('nameBad')); return; }
    const b = document.getElementById('an-save'); b.disabled = true; b.style.opacity = '.6';
    try {
      const { data, error } = await auth.updateName(name);
      if (error) { msg(shortErr(error)); }
      else { if (data && data.user) session = { ...session, user: data.user }; App().ui.closeModal(); renderAccount(); App().refreshProfile(); App().ui.toast('info', '✏️', T('nameSaved'), ''); }
    } catch (e) { msg(shortErr(e)); } finally { b.disabled = false; b.style.opacity = ''; }
  };
}
function openPassDialog() {
  App().ui.openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(T('changePass'))}</h2><button class="modal__close" data-close>×</button></div>
    <div class="field"><label>${esc(T('newPass'))}</label><input class="input" id="ap-1" type="password" autocomplete="new-password"></div>
    <div class="field"><label>${esc(T('confirmPass'))}</label><input class="input" id="ap-2" type="password" autocomplete="new-password"></div>
    <div class="auth-msg" id="ap-msg"></div>
    <button class="btn btn--primary btn--block mt16" id="ap-save">${esc(T('save'))}</button>`);
  const msg = t => { const m = document.getElementById('ap-msg'); if (m) m.textContent = t || ''; };
  document.getElementById('ap-save').onclick = async () => {
    const p1 = document.getElementById('ap-1').value, p2 = document.getElementById('ap-2').value;
    if (!p1 || p1.length < 6) { msg(T('passBad')); return; }
    if (p1 !== p2) { msg(T('passMismatch')); return; }
    const b = document.getElementById('ap-save'); b.disabled = true; b.style.opacity = '.6';
    try { const { error } = await auth.updatePassword(p1); if (error) msg(shortErr(error)); else { App().ui.closeModal(); App().ui.toast('info', '🔑', T('passSaved'), ''); } }
    catch (e) { msg(shortErr(e)); } finally { b.disabled = false; b.style.opacity = ''; }
  };
}
async function doSignOut() {
  try { await auth.signOut(); } catch { /* ignore */ }
  saveMeta({}); session = null; uid = null; _syncedUid = null; status = 'local';
  renderAccount(); App().refreshProfile();     // gate's SIGNED_OUT handler shows the auth screen
}

/* ---- expose + init ---- */
window.AscendCloud = {
  configured: cloudConfigured, auth, mountAccount, handleLocalWipe, beginSync, displayName,
  status: () => status, syncNow: () => { paused = false; pushNow(); },
};

function init() {
  if (!cloudConfigured || !App()) return;
  App().onSave(queuePush);
  window.addEventListener('online', () => { if (session && dirty) pushNow(); });
  auth.onChange((event, sess) => {
    if (event === 'SIGNED_OUT') { session = null; uid = null; _syncedUid = null; paused = false; dirty = false; saveMeta({}); setStatus('local'); App().refreshProfile(); }
    else if (sess && (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED')) { session = sess; uid = sess.user.id; renderAccount(); App().refreshProfile(); }
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
