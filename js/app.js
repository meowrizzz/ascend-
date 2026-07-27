/* =========================================================
   Ascend — Personal RPG tracker (product-ready frontend)
   Vanilla JS · LocalStorage (guest mode) · no server
   ---------------------------------------------------------
   Stage 1 additions:
   - i18n (js/i18n.js), config (js/config.js)
   - Onboarding, expanded profile/settings, private habits
   - Plan configuration + service layers (analytics/notify/subs)
   Derived single-source-of-truth for XP/streaks/stats/levels
   is preserved from prior versions.
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   0. Utilities
--------------------------------------------------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const DAY = 86400000;
const todayKey = (d = new Date()) => {
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const keyToDate = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a, b) => Math.round((keyToDate(b) - keyToDate(a)) / DAY);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const daysWord = n => daysWordL(n); // locale-aware (from i18n.js)
const guessTz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } };

/* ---------------------------------------------------------
   1. Tracking modes + level system
--------------------------------------------------------- */
const goodModes = ['done', 'count', 'duration'];
const limitModes = ['abstinence', 'count', 'duration', 'done'];
const modeLabel = m => t('mode.' + m);
const modeHint = m => t('mode.' + m + '.hint');

const XP_RULES = { done: 10, count: 12, duration: 12, cleanDay: 10, limitOk: 6, journal: 10, crisisWin: 25 };

const LEVEL_TITLES = [
  { min: 1,  key: 'lt.novice' },
  { min: 5,  key: 'lt.explorer' },
  { min: 12, key: 'lt.warrior' },
  { min: 25, key: 'lt.master' },
  { min: 40, key: 'lt.ascendant' },
  { min: 55, key: 'lt.legend' },
];
const xpForLevel = lvl => Math.round(60 * lvl * Math.pow(1.18, lvl - 1));
const levelFromXp = totalXp => {
  let lvl = 1, acc = 0;
  while (acc + xpForLevel(lvl) <= totalXp && lvl < 999) { acc += xpForLevel(lvl); lvl++; }
  const need = xpForLevel(lvl);
  return { level: lvl, into: totalXp - acc, need, pct: clamp((totalXp - acc) / need, 0, 1) };
};
const levelTitle = lvl => t([...LEVEL_TITLES].reverse().find(x => lvl >= x.min)?.key || 'lt.novice');

/* ---------------------------------------------------------
   2. Default (ZERO) state — no demo, no personal data
--------------------------------------------------------- */
const SCHEMA_VERSION = 3;

function createDefaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    user: { id: uid(), name: '', motto: '', avatar: '' },
    settings: {
      language: 'ru', timezone: guessTz(), theme: 'dark', animations: 'full',
      firstDay: 1, timeFormat: '24', missions: true, notifications: false,
      privacyScreen: false, onboarded: false, accountType: 'guest', plan: 'free',
      analyticsConsent: false, hiddenStats: [],
    },
    goals: [],
    reasons: [],
    habits: [],
    journal: {},
    achievements: {},
    crisisWins: [],
    createdKey: todayKey(),
    lastVisit: todayKey(),
  };
}

/* ---------------------------------------------------------
   3. StorageService — single persistence layer
--------------------------------------------------------- */
const StorageService = (() => {
  const KEY = 'ascend_app_state';
  const LEGACY_KEYS = ['ascend.v1'];
  const OWNED_KEYS = [KEY, ...LEGACY_KEYS];
  const isObj = o => o && typeof o === 'object' && !Array.isArray(o);

  function validateData(s) {
    return isObj(s) && isObj(s.user) && Array.isArray(s.habits) && isObj(s.journal) && isObj(s.achievements) && isObj(s.settings);
  }
  function isLegacyDemo(s) {
    if (!s) return false;
    const demoNames = ['Порно', 'Мастурбация', 'Сахар', 'Контроль телефона', 'Спорт', 'Чтение', 'Учёба Java', 'Медитация'];
    const habits = Array.isArray(s.habits) ? s.habits : [];
    const journalEmpty = !s.journal || Object.keys(s.journal).length === 0;
    const looksSeed = habits.length === 8 && demoNames.every(n => habits.some(h => h.name === n));
    return looksSeed && journalEmpty && (s.xp === 340 || s.user?.name === 'meowrizzz');
  }
  function normalizeHabit(h, i) {
    const type = h.type === 'bad' ? 'bad' : 'good';
    let mode = h.mode;
    if (mode === 'streak') mode = 'abstinence';
    else if (mode === 'daily') mode = 'done';
    else if (mode === 'amount') mode = 'duration';
    if (type === 'good' && !goodModes.includes(mode)) mode = 'done';
    if (type === 'bad' && !limitModes.includes(mode)) mode = 'abstinence';
    const start = h.startKey || h.originAt || todayKey();
    return {
      id: h.id || uid(),
      name: String(h.name || 'Habit'),
      description: h.description || '',
      icon: h.icon || '🎯',
      color: h.color || '#4C8DFF',
      type, mode,
      goal: Math.max(1, Number(h.goal) || 1),
      unit: h.unit || (type === 'bad' ? 'дней' : 'раз'),
      step: Math.max(1, Number(h.step) || 1),
      stat: ['discipline', 'strength', 'knowledge', 'resilience'].includes(h.stat) ? h.stat : null,
      startKey: start, originAt: h.originAt || start,
      relapses: Array.isArray(h.relapses) ? h.relapses.filter(Boolean) : [],
      log: isObj(h.log) ? h.log : {},
      archived: !!h.archived,
      private: !!h.private,
      alias: h.alias || '',
      pinned: !!h.pinned,
      order: Number.isFinite(h.order) ? h.order : i,
      createdAt: h.createdAt || start,
      updatedAt: h.updatedAt || start,
    };
  }
  function normalizeJournal(j) {
    const out = {};
    if (isObj(j)) for (const k in j) {
      const e = j[k] || {};
      out[k] = { id: e.id || uid(), date: e.date || k, mood: e.mood ?? 5, energy: e.energy ?? 5, sleepH: e.sleepH ?? 7, sleepQ: e.sleepQ ?? 3, urge: e.urge ?? 3, good: e.good || '', hard: e.hard || '', helped: e.helped || '', notes: e.notes || '', triggers: Array.isArray(e.triggers) ? e.triggers : [], createdAt: e.createdAt || k, updatedAt: e.updatedAt || k };
    }
    return out;
  }
  function normalizeAch(a) {
    const out = {};
    if (isObj(a)) for (const k in a) { const v = a[k]; out[k] = typeof v === 'string' ? { unlockedAt: v } : (v?.unlockedAt ? { unlockedAt: v.unlockedAt } : { unlockedAt: todayKey() }); }
    return out;
  }
  function normalizeCrisis(c, ck) {
    if (Array.isArray(c)) return c.map(x => (x && x.id ? x : { id: uid(), dateKey: x?.dateKey || ck || todayKey() }));
    if (typeof c === 'number') return Array.from({ length: c }, () => ({ id: uid(), dateKey: ck || todayKey() }));
    return [];
  }
  function normalizeState(raw) {
    const base = createDefaultState();
    if (!isObj(raw)) return base;
    const s = { ...base, ...raw };
    s.schemaVersion = SCHEMA_VERSION;
    s.user = { ...base.user, ...(raw.user || {}) };
    if (!s.user.id) s.user.id = uid();
    s.settings = { ...base.settings, ...(raw.settings || {}) };
    s.goals = Array.isArray(raw.goals) ? raw.goals : [];
    s.reasons = Array.isArray(raw.reasons) ? raw.reasons.filter(x => typeof x === 'string') : [];
    s.habits = (Array.isArray(raw.habits) ? raw.habits : []).map(normalizeHabit);
    s.journal = normalizeJournal(raw.journal);
    s.achievements = normalizeAch(raw.achievements);
    s.createdKey = raw.createdKey || todayKey();
    s.crisisWins = normalizeCrisis(raw.crisisWins, s.createdKey);
    s.lastVisit = todayKey();
    return s;
  }
  function migrateData(raw) {
    if (!isObj(raw)) return createDefaultState();
    if (!raw.schemaVersion) { if (isLegacyDemo(raw)) return createDefaultState(); return normalizeState(raw); }
    return normalizeState(raw);
  }
  function loadState() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch { /* ignore */ }
    if (!raw) {
      for (const lk of LEGACY_KEYS) {
        let legacy = null;
        try { legacy = localStorage.getItem(lk); } catch { /* ignore */ }
        if (legacy) { try { const m = migrateData(JSON.parse(legacy)); try { localStorage.removeItem(lk); } catch {} saveState(m); return m; } catch {} }
      }
      return createDefaultState();
    }
    try { const m = migrateData(JSON.parse(raw)); return validateData(m) ? m : createDefaultState(); }
    catch { return createDefaultState(); }
  }
  function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }
  function resetProgress(s) {
    const kept = {
      schemaVersion: SCHEMA_VERSION, user: s.user, settings: s.settings, goals: s.goals, reasons: s.reasons,
      habits: s.habits.map(h => ({ ...h, startKey: todayKey(), originAt: todayKey(), relapses: [], log: {}, createdAt: todayKey(), updatedAt: todayKey() })),
      journal: {}, achievements: {}, crisisWins: [], createdKey: todayKey(), lastVisit: todayKey(),
    };
    saveState(kept); return kept;
  }
  function deleteAllData() { for (const k of OWNED_KEYS) { try { localStorage.removeItem(k); } catch {} } const fresh = createDefaultState(); saveState(fresh); return fresh; }
  function exportData(s) { return { app: 'Ascend', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: s }; }
  function importData(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch { return { ok: false, error: 'JSON parse error' }; }
    if (!parsed || parsed.app !== 'Ascend') return { ok: false, error: 'Not an Ascend backup' };
    if (typeof parsed.schemaVersion !== 'number') return { ok: false, error: 'Missing schemaVersion' };
    if (!isObj(parsed.data)) return { ok: false, error: 'No data' };
    const m = migrateData(parsed.data);
    if (!validateData(m)) return { ok: false, error: 'Corrupted structure' };
    return { ok: true, state: m, summary: { exportedAt: parsed.exportedAt || null, habits: m.habits.length, journalDays: Object.keys(m.journal).length, achievements: Object.keys(m.achievements).length } };
  }
  return { KEY, OWNED_KEYS, loadState, saveState, resetProgress, deleteAllData, exportData, importData, validateData, migrateData };
})();

/* ---------------------------------------------------------
   4. App state + persistence + service layers
--------------------------------------------------------- */
let state = StorageService.loadState();
const settings = () => state.settings;

let _onSaveHook = null;                       // set by cloud-sync (optional); no-op locally
function saveLocalOnly() { StorageService.saveState(state); showSaved(); }
function save() { saveLocalOnly(); if (_onSaveHook) { try { _onSaveHook(); } catch { /* cloud errors never block local */ } } }
let _savedTimer = null;
function showSaved() {
  let ind = $('#saveIndicator');
  if (!ind) { ind = el('div', 'save-indicator'); ind.id = 'saveIndicator'; document.body.appendChild(ind); }
  ind.innerHTML = `<span class="dot"></span><span>${t('toast.saved')}</span>`;
  ind.classList.add('show');
  clearTimeout(_savedTimer);
  _savedTimer = setTimeout(() => ind.classList.remove('show'), 1400);
}

// Analytics: opt-in, whitelist-only, NEVER sensitive. No-op sink in Stage 1.
const ALLOWED_ANALYTICS = new Set(['onboarding_complete', 'habit_created', 'first_check', 'account_created', 'report_viewed', 'missions_viewed', 'plans_viewed', 'checkout_started', 'subscribed', 'unsubscribed', 'returned']);
const analyticsService = {
  track(event, props = {}) {
    if (!FEATURE_FLAGS.analytics || !settings().analyticsConsent) return;
    if (!ALLOWED_ANALYTICS.has(event)) return;
    const safe = {};
    for (const k of ['plan', 'count', 'lang', 'platform']) if (k in props) safe[k] = props[k];
    /* No network sink wired yet — validated & dropped. Never includes journal/private data. */
  },
};
// Subscription: config-driven, provider-agnostic. No real payments in Stage 1.
const subscriptionService = {
  currentPlan: () => settings().plan || 'free',
  isPremium: () => (settings().plan || 'free') !== 'free',
  limit: key => planLimit(settings().plan || 'free', key),
  startCheckout() { return FEATURE_FLAGS.payments ? { ok: false, reason: 'not_implemented' } : { ok: false, reason: 'payments_disabled' }; },
};
// Notifications: neutral copy only; gated by flag + user setting.
const notificationService = {
  async requestPermission() { if (!('Notification' in window)) return 'unsupported'; try { return await Notification.requestPermission(); } catch { return 'denied'; } },
  canNotify() { return FEATURE_FLAGS.pushNotifications && settings().notifications && typeof Notification !== 'undefined' && Notification.permission === 'granted'; },
  neutral(bodyKey) { if (!this.canNotify()) return; try { new Notification('Ascend', { body: t(bodyKey) }); } catch {} },
};

/* ---------------------------------------------------------
   5. Derived domain logic (single source of truth)
--------------------------------------------------------- */
const activeHabits = () => state.habits.filter(h => !h.archived).sort((a, b) => (a.order || 0) - (b.order || 0));
const archivedHabits = () => state.habits.filter(h => h.archived);

function currentStart(h) { const r = (h.relapses || []).slice().sort(); return r.length ? r[r.length - 1] : (h.originAt || h.startKey); }
function badStreak(h) { return Math.max(0, daysBetween(currentStart(h), todayKey())); }
function abstinenceCleanDays(h) { return abstinenceCleanDaysAsOf(h, todayKey()); }
// Clean days accumulated up to (and including) a given calendar day — used to
// reconstruct a stat's value "as of" any past date for the growth history.
function abstinenceCleanDaysAsOf(h, upto) {
  const origin = h.originAt || h.startKey;
  const end = upto < todayKey() ? upto : todayKey();
  let total = 0, seg = origin;
  for (const r of (h.relapses || []).slice().sort()) { if (r > upto) break; total += Math.max(0, daysBetween(seg, r)); seg = r; }
  return total + Math.max(0, daysBetween(seg, end));
}
function badBest(h) {
  const origin = h.originAt || h.startKey; let best = 0, seg = origin;
  for (const r of (h.relapses || []).slice().sort()) { best = Math.max(best, daysBetween(seg, r)); seg = r; }
  return Math.max(0, Math.max(best, daysBetween(seg, todayKey())));
}
function logTotal(h) { const log = h.log || {}; return h.mode === 'done' ? Object.values(log).filter(Boolean).length : Object.values(log).reduce((s, v) => s + (Number(v) || 0), 0); }
function todayValue(h) { return Number((h.log || {})[todayKey()]) || 0; }
function checkedToday(h) { const v = (h.log || {})[todayKey()]; return h.mode === 'done' ? !!v : (Number(v) || 0) > 0; }
function doneStreakDays(h) { let n = 0, d = new Date(); for (;;) { const v = (h.log || {})[todayKey(d)]; const has = h.mode === 'done' ? !!v : (Number(v) || 0) > 0; if (!has) break; n++; d = new Date(d.getTime() - DAY); } return n; }
function habitProgress(h) {
  if (h.type === 'bad' && h.mode === 'abstinence') { const s = badStreak(h); return { current: s, pct: clamp(s / h.goal, 0, 1) }; }
  if (h.mode === 'done') { const t2 = logTotal(h); return { current: t2, pct: clamp(t2 / h.goal, 0, 1) }; }
  if (h.type === 'bad') { const tv = todayValue(h); return { current: tv, pct: clamp(tv / h.goal, 0, 1), overLimit: tv > h.goal }; }
  const t2 = logTotal(h); return { current: t2, pct: clamp(t2 / h.goal, 0, 1) };
}
function totalCheckins() { let n = 0; for (const h of state.habits) { const log = h.log || {}; for (const k in log) n += (h.mode === 'done' ? (log[k] ? 1 : 0) : ((Number(log[k]) || 0) > 0 ? 1 : 0)); } return n; }
function daysSinceCreated() { return Math.max(0, daysBetween(state.createdKey, todayKey())); }
// True once the user has actually done something (used to replace "wall of zeros").
const hasActivity = () => totalCheckins() > 0 || Object.keys(state.journal).length > 0 || (state.crisisWins || []).length > 0;
// Limit-category (control) context — gates crisis mode + the "urge" slider.
const hasLimitContext = () => state.habits.some(h => h.type === 'bad') || (state.crisisWins || []).length > 0;

// Shared habit-logging logic (same behavior on the Habits tab and the Dashboard).
function habitCheckToggle(h) {
  const was = checkedToday(h);
  if (was) withXp(() => { delete h.log[todayKey()]; h.updatedAt = todayKey(); }, null);
  else withXp(() => { h.log[todayKey()] = 1; h.updatedAt = todayKey(); }, manageHabitName(h));
}
function habitQuickAdd(h) {
  const step = Number(h.step) > 0 ? Number(h.step) : 1;
  withXp(() => { h.log[todayKey()] = clamp((Number(h.log[todayKey()]) || 0) + step, 0, 1e6); h.updatedAt = todayKey(); }, manageHabitName(h));
}

function computeXp() {
  let xp = 0;
  for (const h of state.habits) {
    const log = h.log || {};
    if (h.type === 'bad' && h.mode === 'abstinence') xp += abstinenceCleanDays(h) * XP_RULES.cleanDay;
    else if (h.mode === 'done') { for (const k in log) if (log[k]) xp += XP_RULES.done; }
    else if (h.type === 'bad') { for (const k in log) { const v = Number(log[k]) || 0; if (v > 0 && v <= h.goal) xp += XP_RULES.limitOk; } }
    else { for (const k in log) { const v = Number(log[k]) || 0; if (v > 0) xp += XP_RULES[h.mode] || XP_RULES.count; } }
  }
  xp += Object.keys(state.journal).length * XP_RULES.journal;
  xp += (state.crisisWins || []).length * XP_RULES.crisisWin;
  return xp;
}
const currentXp = () => computeXp();

/* ---- Character-stat progression (RPG model) ----------------------------
   Hidden formula. A stat's % is NOT a linear "+X per action". Instead each
   success contributes weighted "stat points" that saturate toward 100 on a
   diminishing curve, so early wins feel good but mastery takes a long time.

     points(action) = BASE · difficultyWeight · valuePerUnit · effDays(nSuccess)
     effDays(n)     = anti-farm: marginal day fades 1.0 → 0.5 over a streak
     percent(P)     = 100 · (1 − e^(−P / K))          (non-linear saturation)

   Extensible: add a stat by adding it to STAT_MODEL.stats and routing a
   habit's `stat` to it — no other change needed.
------------------------------------------------------------------------- */
const STAT_MODEL = {
  base: 1.0,            // points per effective standard day
  farmHalfLife: 33,     // F — how slowly the daily reward fades toward 50%
  curveK: 70,           // saturation constant (higher = slower to reach 100%)
  diff: { light: 0.7, medium: 1.0, hard: 1.8 },
  crisisValue: 2.5,     // value per crisis win (hard, discrete)
  journalWeight: 0.7,   // journaling counts as a light habit
  stats: ['discipline', 'strength', 'knowledge', 'resilience'],
};
// Anti-farm: total effective days from n successes; marginal day 1.0 → 0.5.
function effDays(n, F = STAT_MODEL.farmHalfLife) {
  n = Math.max(0, n);
  return 0.5 * n + 0.5 * F * (1 - Math.exp(-n / F));
}
// Non-linear saturation: fast 0–20%, moderate 20–50%, slow 50–80%, very slow 80–100%.
function statPercent(points) { return clamp(Math.round(100 * (1 - Math.exp(-points / STAT_MODEL.curveK))), 0, 100); }
// Difficulty tier: abstinence/impulses = hard; skill/physical building = medium; maintenance = light.
function habitWeight(h) {
  if (h.type === 'bad' && h.mode === 'abstinence') return STAT_MODEL.diff.hard;
  if (h.stat === 'strength' || h.stat === 'knowledge') return STAT_MODEL.diff.medium;
  return STAT_MODEL.diff.light;
}
const contribution = (nSuccess, weight, valuePerUnit = 1) => STAT_MODEL.base * weight * valuePerUnit * effDays(nSuccess);

// Raw stat "points" as of a calendar day (default: today). Sole growth logic.
function statPoints(upto = todayKey()) {
  const pts = {}; STAT_MODEL.stats.forEach(s => pts[s] = 0);
  const bump = (s, v) => { if (pts[s] !== undefined) pts[s] += v; };
  for (const h of state.habits) {
    if (h.type === 'bad' && h.mode === 'abstinence') {
      const cd = abstinenceCleanDaysAsOf(h, upto);
      if (cd > 0) { const c = contribution(cd, habitWeight(h)); bump('discipline', c * 0.7); bump('resilience', c * 0.6); }
      continue;
    }
    const log = h.log || {};
    const days = Object.keys(log).filter(k => k <= upto && (h.mode === 'done' ? !!log[k] : (Number(log[k]) || 0) > 0)).length;
    if (!days) continue;
    const c = contribution(days, habitWeight(h));
    if (h.stat && pts[h.stat] !== undefined) bump(h.stat, c);
    else bump('discipline', c * 0.5);                                   // any consistency builds a little discipline
  }
  const cw = (state.crisisWins || []).filter(x => (x.dateKey || upto) <= upto).length;
  if (cw) { const c = contribution(cw, STAT_MODEL.diff.hard, STAT_MODEL.crisisValue); bump('discipline', c * 0.5); bump('resilience', c); }
  const jd = Object.keys(state.journal).filter(k => k <= upto).length;
  if (jd) { const c = contribution(jd, STAT_MODEL.journalWeight); bump('discipline', c * 0.6); bump('resilience', c * 0.4); }
  return pts;
}
function characterStats() { const p = statPoints(); const out = {}; STAT_MODEL.stats.forEach(s => out[s] = statPercent(p[s])); return out; }
function statsAsOf(upto) { const p = statPoints(upto); const out = {}; STAT_MODEL.stats.forEach(s => out[s] = statPercent(p[s])); return out; }
const statDef = id => CHARACTER_STATS.find(s => s.id === id);
const STAT_COLOR = { discipline: '--green', strength: '--blue', knowledge: '--violet', resilience: '--green' };
function statRank(pct) { return t([...STAT_RANKS].reverse().find(r => pct >= r.min)?.key || STAT_RANKS[0].key); }
// Reconstructed growth checkpoints (evenly spaced from account start to today).
function statTrend(id, n = 6) {
  const start = state.createdKey, end = todayKey();
  const span = Math.max(0, daysBetween(start, end));
  const out = [];
  if (span <= 0) return [{ key: end, pct: statsAsOf(end)[id] }];
  for (let i = 0; i < n; i++) {
    const d = Math.round(span * i / (n - 1));
    const k = todayKey(new Date(keyToDate(start).getTime() + d * DAY));
    out.push({ key: k, pct: statsAsOf(k)[id] });
  }
  return out;
}
function aggregateStats() {
  const abst = state.habits.filter(h => h.type === 'bad' && h.mode === 'abstinence');
  return {
    cleanDays: abst.reduce((s, h) => s + abstinenceCleanDays(h), 0),
    bestStreak: Math.max(0, ...abst.map(badBest)),
    relapses: state.habits.reduce((s, h) => s + ((h.relapses || []).length), 0),
    workouts: state.habits.filter(h => h.stat === 'strength').reduce((s, h) => s + logTotal(h), 0),
    knowledgeUnits: state.habits.filter(h => h.stat === 'knowledge').reduce((s, h) => s + logTotal(h), 0),
    journalDays: Object.keys(state.journal).length,
    crisisWins: (state.crisisWins || []).length,
  };
}

/* Actions with XP feedback (idempotent). */
function withXp(mutate, label) {
  const before = computeXp(), lvlBefore = levelFromXp(before).level;
  const ptsBefore = statPoints();
  mutate(); save();
  const after = computeXp(), delta = after - before;
  if (delta > 0) toast('xp', '⚡', `+${delta} XP`, label || '');
  statFeedback(ptsBefore, statPoints());          // qualitative, never a raw %
  const lvlAfter = levelFromXp(after).level;
  if (lvlAfter > lvlBefore) setTimeout(() => unlockOverlay('⬆️', 'Level ' + lvlAfter, levelTitle(lvlAfter)), 500);
  checkAchievements();
}
// Turn a hidden stat-point delta into a felt, qualitative message (no numbers).
function statFeedback(before, after) {
  let best = null, bestD = 0;
  for (const s of STAT_MODEL.stats) { const d = (after[s] || 0) - (before[s] || 0); if (d > bestD) { bestD = d; best = s; } }
  if (!best || bestD < 0.05) return;
  const def = statDef(best); if (!def) return;
  const qual = bestD < 0.6 ? t('fb.small') : bestD < 1.5 ? t('fb.good') : t('fb.strong');
  toast('stat', def.emoji, `${t(def.key)} · ${qual}`, '');
}

/* ---------------------------------------------------------
   6. Achievements — extensible, config-generated (80+)
--------------------------------------------------------- */
const ACH_ICONS_STREAK = ['🔥', '🥉', '🥈', '🥇', '🏅', '👑', '💠', '🛡', '⚔️', '🌟', '♾️'];
function buildAchievements() {
  const A = [];
  const add = (id, icon, cat, nameKey, vars, metric, target, hidden) => A.push({ id, icon, cat, nameKey, vars, metric, target, hidden: !!hidden });
  // Start
  add('start_habit', '🌱', 'start', 'achg.firstHabit', null, () => state.habits.length, 1);
  add('start_check', '✅', 'start', 'achg.firstCheck', null, () => totalCheckins(), 1);
  add('start_journal', '📝', 'start', 'achg.firstJournal', null, () => aggregateStats().journalDays, 1);
  add('start_week', '📅', 'start', 'achg.firstWeek', null, () => daysSinceCreated(), 7);
  // Streaks
  [3, 7, 14, 21, 30, 50, 60, 90, 120, 180, 365].forEach((n, i) => add('streak_' + n, ACH_ICONS_STREAK[i] || '🔥', 'streaks', 'achg.streak', { n }, () => aggregateStats().bestStreak, n));
  // Consistency
  [10, 25, 50, 100, 200, 365, 500, 1000].forEach(n => add('checkins_' + n, '📈', 'consistency', 'achg.checkins', { n }, () => totalCheckins(), n));
  // Sport
  [5, 10, 20, 30, 50, 75, 100, 150, 200].forEach(n => add('sport_' + n, '🏋', 'sport', 'achg.sport', { n }, () => aggregateStats().workouts, n));
  // Learning
  [10, 25, 50, 100, 200, 300, 500, 750, 1000].forEach(n => add('learn_' + n, '📚', 'learning', 'achg.learn', { n }, () => aggregateStats().knowledgeUnits, n));
  // Journal
  [3, 7, 14, 30, 60, 100, 200].forEach(n => add('journal_' + n, '📔', 'journal', 'achg.journal', { n }, () => aggregateStats().journalDays, n));
  // Mindfulness (crisis)
  [1, 3, 5, 10, 25, 50].forEach(n => add('crisis_' + n, '🛡', 'mindfulness', 'achg.crisis', { n }, () => aggregateStats().crisisWins, n));
  // Recovery (logged a slip and kept going — framed positively)
  [1, 3, 5, 10].forEach(n => add('recovery_' + n, '🌿', 'recovery', 'achg.recovery', { n }, () => aggregateStats().relapses, n));
  // Levels
  [2, 5, 10, 15, 20, 25, 30, 40, 50].forEach(n => add('level_' + n, '⭐', 'levels', 'achg.level', { n }, () => levelFromXp(computeXp()).level, n));
  // XP
  [100, 500, 1000, 2500, 5000, 10000, 25000].forEach(n => add('xp_' + n, '💎', 'xp', 'achg.xp', { n }, () => computeXp(), n));
  // Universal (habit count)
  [3, 5, 8, 12, 20].forEach(n => add('habits_' + n, '🧩', 'universal', 'achg.habits', { n }, () => state.habits.length, n));
  // Clean days total
  [30, 100, 180, 365].forEach(n => add('clean_' + n, '💚', 'universal', 'achg.clean', { n }, () => aggregateStats().cleanDays, n));
  // Hidden
  add('hidden_balance', '⚖️', 'hidden', 'achg.hBalance', null, () => { const s = characterStats(); return (s.discipline > 0 && s.strength > 0 && s.knowledge > 0) ? 1 : 0; }, 1, true);
  add('hidden_comeback', '🔁', 'hidden', 'achg.hComeback', null, () => (aggregateStats().relapses >= 3 && aggregateStats().bestStreak >= 7) ? 1 : 0, 1, true);
  add('hidden_dedication', '🗿', 'hidden', 'achg.hDedication', null, () => (daysSinceCreated() >= 30 && state.habits.length >= 1) ? 1 : 0, 1, true);
  return A;
}
let ACHIEVEMENTS = buildAchievements();
const ACH_CATS = ['start', 'streaks', 'consistency', 'sport', 'learning', 'journal', 'mindfulness', 'recovery', 'levels', 'xp', 'universal', 'hidden'];
const achName = a => t(a.nameKey, a.vars);
const achDesc = a => t('acd.' + a.cat);
function achProgress(a) { const cur = a.metric(); return { cur, pct: clamp(cur / a.target, 0, 1), done: cur >= a.target }; }
function checkAchievements(silent = false) {
  let changed = false;
  ACHIEVEMENTS.forEach(a => { if (achProgress(a).done && !state.achievements[a.id]) { state.achievements[a.id] = { unlockedAt: todayKey() }; changed = true; if (!silent) unlockOverlay(a.icon, t('ach.unlockedKicker'), achName(a)); } });
  if (changed) StorageService.saveState(state);
}
function reconcileAchievements() {
  let changed = false;
  ACHIEVEMENTS.forEach(a => { if (!achProgress(a).done && state.achievements[a.id]) { delete state.achievements[a.id]; changed = true; } });
  if (changed) StorageService.saveState(state);
}

/* ---------------------------------------------------------
   7. Privacy helpers
--------------------------------------------------------- */
let sensitiveRevealed = false;
const isSensitiveHidden = () => !!settings().privacyScreen && !sensitiveRevealed;
const anyActivePrivate = () => state.habits.some(h => h.private && !h.archived);
function revealSensitive() { sensitiveRevealed = true; render(); }
// Home dashboard shows a neutral alias for private habits.
function homeHabitName(h) { return h.private ? (h.alias || t('form.aliasPh')) : h.name; }
// Management list shows real name unless the privacy screen is active & not revealed.
function manageHabitName(h) { return (h.private && isSensitiveHidden()) ? (h.alias || t('form.aliasPh')) : h.name; }

/* ---------------------------------------------------------
   8. Router + builders
--------------------------------------------------------- */
let currentScreen = 'home';
const screens = {};
function render() {
  const root = $('#screens');
  root.innerHTML = '';
  root.appendChild((screens[currentScreen] || screens.home)());
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === currentScreen));
  updateCrisisVisibility();
  window.scrollTo(0, 0);
}
// Crisis mode is only relevant to users with a limit-category habit (or who
// have used it before) — hide it for everyone else.
function updateCrisisVisibility() { const b = $('#crisisBtn'); if (b) b.classList.toggle('hidden', !hasLimitContext()); }
function go(screen) { currentScreen = screen; render(); }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function emptyState(em, ttl, sub, btnLabel, onClick, btnClass = 'btn--primary') {
  const box = el('div', 'empty-state');
  box.innerHTML = `<div class="em">${em}</div><div class="es-ttl">${esc(ttl)}</div><div class="es-sub">${esc(sub)}</div>` + (btnLabel ? `<button class="btn btn--sm ${btnClass}">${esc(btnLabel)}</button>` : '');
  if (onClick) box.querySelector('button')?.addEventListener('click', onClick);
  return box;
}
function sectionTitle(title, actionLabel, onClick) {
  const s = el('div', 'section-title');
  s.innerHTML = `<div class="h2">${esc(title)}</div>` + (actionLabel ? `<button class="btn btn--sm btn--ghost" style="padding:6px 4px;color:var(--text-dim)">${esc(actionLabel)} ›</button>` : '');
  if (onClick) s.querySelector('button')?.addEventListener('click', onClick);
  return s;
}
// When signed in, the account's display_name (from Supabase) takes priority over
// the local placeholder; otherwise fall back to the local name / neutral value.
const accountName = () => { try { const n = window.AscendCloud && window.AscendCloud.displayName && window.AscendCloud.displayName(); return (typeof n === 'string' && n.trim()) ? n.trim() : ''; } catch { return ''; } };
const userDisplayName = () => accountName() || state.user.name.trim() || t('app.you');
const userAvatar = () => { const n = accountName() || state.user.name.trim(); return state.user.avatar || (n[0] || '★').toUpperCase(); };
const userMotto = () => state.user.motto.trim() || t('app.tagline');

/* ---------------------------------------------------------
   9. HOME
--------------------------------------------------------- */
screens.home = () => {
  const wrap = el('section', 'screen');
  const xp = currentXp(); const lv = levelFromXp(xp); const stats = characterStats();
  const hidden = new Set(settings().hiddenStats || []);
  const statCells = [
    ['discipline', '🧠', t('stat.discipline'), stats.discipline],
    ['strength', '💪', t('stat.strength'), stats.strength],
    ['knowledge', '📚', t('stat.knowledge'), stats.knowledge],
  ].filter(c => !hidden.has(c[0]));

  wrap.innerHTML = `
    <div class="profile-head">
      <div class="avatar">${esc(userAvatar())}</div>
      <div class="profile-head__meta">
        <div class="profile-head__name">${esc(userDisplayName())}</div>
        <div class="profile-head__sub">${esc(userMotto())}</div>
      </div>
    </div>
    <div class="card level-card">
      <div class="level-row">
        <span class="level-badge"><span>Level</span><span class="lv">${lv.level}</span></span>
        <span class="level-title">${esc(levelTitle(lv.level))}</span>
      </div>
      <div class="xp-bar"><div class="xp-fill" id="xpFill"></div></div>
      <div class="xp-meta"><span>${lv.into} XP</span><span>${lv.need} XP ${esc(t('level.to', { n: lv.level + 1 }))}</span></div>
      <div class="stat-grid">${statCells.map(c => statCell(c[0], c[1], c[2], c[3])).join('')}</div>
      ${!hasActivity() ? `<div class="starter-hint">🌱 <b>${esc(t('start.beginning'))}</b> · ${esc(t('home.starterHint'))}</div>` : ''}
    </div>`;

  if (!activeHabits().length) {
    const first = emptyState('🌱', t('empty.startTitle'), t('empty.startSub'), t('empty.addHabit'), openCatalog);
    first.style.marginTop = '14px';
    wrap.appendChild(first);
  } else {
    // reveal bar for privacy screen
    if (anyActivePrivate() && isSensitiveHidden()) {
      const bar = el('div', 'card reveal-bar');
      bar.innerHTML = `<span>🔒 ${esc(t('set.privacyScreen'))}</span><button class="btn btn--sm btn--ghost" id="revealBtn">${esc(t('reveal.private'))}</button>`;
      wrap.appendChild(bar);
      bar.querySelector('#revealBtn').onclick = revealSensitive;
    }
    const abst = activeHabits().filter(h => h.type === 'bad' && h.mode === 'abstinence');
    const hero = abst.slice().sort((a, b) => badStreak(b) - badStreak(a))[0];
    if (hero) wrap.appendChild(heroStreakCard(hero));

    if (settings().missions && FEATURE_FLAGS.dailyMissions) { const mc = missionsCard(); if (mc) wrap.appendChild(mc); }

    wrap.appendChild(sectionTitle(t('home.myStats'), t('home.allHabits'), () => go('habits')));
    const grid = el('div', 'habit-grid stagger');
    activeHabits().forEach(h => grid.appendChild(homeHabitCard(h)));
    wrap.appendChild(grid);
  }

  const journaled = !!state.journal[todayKey()];
  const cta = el('div', 'card'); cta.style.marginTop = '14px';
  cta.innerHTML = `
    <div style="padding:16px;display:flex;align-items:center;gap:14px">
      <div style="font-size:28px">${journaled ? '✅' : '📓'}</div>
      <div style="flex:1">
        <div class="h2" style="font-size:16px">${journaled ? esc(t('home.journalDone')) : esc(t('home.journalTitle'))}</div>
        <div class="muted" style="font-size:13px;margin-top:2px">${journaled ? esc(t('home.journalDoneSub')) : esc(t('home.journalSub'))}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        <button class="btn btn--sm ${journaled ? 'btn--ghost' : 'btn--blue'}" id="openJournal">${journaled ? esc(t('home.change')) : esc(t('home.open'))}</button>
        ${Object.keys(state.journal).length ? `<button class="btn btn--sm btn--ghost" id="openJournalHist" style="padding:7px 12px;font-size:12px">${esc(t('jh.short'))}</button>` : ''}
      </div>
    </div>`;
  wrap.appendChild(cta);
  cta.querySelector('#openJournal').onclick = openJournalModal;
  cta.querySelector('#openJournalHist')?.addEventListener('click', () => go('journalHistory'));

  requestAnimationFrame(() => { const f = wrap.querySelector('#xpFill'); if (f) f.style.width = (lv.pct * 100) + '%'; });
  animateStatTracks(wrap);
  return wrap;
};

function heroStreakCard(hero) {
  const s = badStreak(hero); const pct = clamp(s / hero.goal, 0, 1); const R = 58, C = 2 * Math.PI * R;
  const name = homeHabitName(hero);
  const card = el('div', 'card hero-streak');
  card.innerHTML = `
    <div class="ring-wrap">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <defs><linearGradient id="grad-green" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3DDC97"/><stop offset="1" stop-color="#4C8DFF"/></linearGradient></defs>
        <circle class="ring-bg" cx="66" cy="66" r="${R}" stroke-width="11"/>
        <circle class="ring-fg" cx="66" cy="66" r="${R}" stroke-width="11" stroke-dasharray="${C}" stroke-dashoffset="${C}" id="heroRing"/>
      </svg>
      <div class="ring-center"><div class="num">${s}</div><div class="unit">${daysWord(s)}</div></div>
    </div>
    <div class="hero-streak__info">
      <div class="ttl">🔥 ${esc(name)}</div>
      <div class="desc">${esc(t('app.tagline'))} · ${esc(t('habits.goal'))} ${hero.goal} ${esc(hero.unit)}</div>
      <div class="hero-streak__best">${esc(t('habits.record'))}: <b>${badBest(hero)} ${daysWord(badBest(hero))}</b></div>
    </div>`;
  requestAnimationFrame(() => { const r = card.querySelector('#heroRing'); if (r) r.style.strokeDashoffset = C * (1 - pct); });
  return card;
}
function statCell(cls, ico, lbl, val) {
  return `<div class="stat-cell ${cls}" data-stat="${cls}" role="button" tabindex="0" aria-label="${esc(lbl)} ${val}% · ${esc(statRank(val))}"><div class="ico">${ico}</div><div class="val">${val}%</div><div class="lbl">${esc(lbl)}</div><div class="rank">${esc(statRank(val))}</div><div class="track"><i data-w="${val}"></i></div></div>`;
}
function animateStatTracks(root) {
  requestAnimationFrame(() => $$('.stat-cell .track > i', root).forEach(i => i.style.width = clamp(+i.dataset.w, 0, 100) + '%'));
  $$('.stat-cell[data-stat]', root).forEach(c => {
    const open = () => openStatDetail(c.dataset.stat);
    c.onclick = open;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
  });
}

// Stat detail: meaning + rank + what develops it + reconstructed growth history.
function openStatDetail(id) {
  const def = statDef(id); if (!def) return;
  const pct = characterStats()[id];
  const cvar = STAT_COLOR[id] || '--green';
  const linked = activeHabits().filter(h => h.stat === id || (id === 'discipline' && ((h.type === 'bad' && h.mode === 'abstinence') || !h.stat)));
  const trend = statTrend(id);
  const first = trend[0]?.pct ?? 0, last = trend[trend.length - 1]?.pct ?? pct;
  const grew = last - first;
  // sparkline
  const W = 300, H = 72, pad = 6;
  const xs = i => pad + i * (W - 2 * pad) / Math.max(1, trend.length - 1);
  const ys = v => H - pad - (v / 100) * (H - 2 * pad);
  const line = trend.map((p, i) => (i ? 'L' : 'M') + xs(i).toFixed(1) + ' ' + ys(p.pct).toFixed(1)).join(' ');
  const area = `${line} L${xs(trend.length - 1).toFixed(1)} ${H - pad} L${pad} ${H - pad} Z`;
  const dots = trend.map((p, i) => `<circle cx="${xs(i).toFixed(1)}" cy="${ys(p.pct).toFixed(1)}" r="2.6" fill="var(${cvar})"/>`).join('');
  const showTrend = trend.length > 1 && trend.some(p => p.pct > 0);
  const fmt = k => keyToDate(k).toLocaleDateString(getLang() === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' });

  openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${def.emoji} ${esc(t(def.key))}</h2><button class="modal__close" data-close aria-label="${esc(t('common.close'))}">×</button></div>
    <div class="stat-detail">
      <div class="sd-top"><div class="sd-pct" style="color:var(${cvar})">${pct}%</div><div class="sd-rank"><span class="sd-rank-l">${esc(t('stat.rankLabel'))}</span> ${esc(statRank(pct))}</div></div>
      <div class="xp-bar" style="margin-top:12px"><div class="xp-fill" style="width:${pct}%;background:linear-gradient(90deg,var(${cvar}),var(${cvar}));box-shadow:none"></div></div>
      <p class="sd-desc">${esc(t(def.descKey))}</p>
      <div class="sd-section"><div class="sd-h">${esc(t('stat.about'))}</div><p class="sd-grows">${esc(t(def.growsKey))}</p></div>
      ${linked.length ? `<div class="sd-section"><div class="sd-h">${esc(t('stat.linked'))}</div><div class="sd-habits">${linked.map(h => `<span class="sd-habit">${h.icon} ${esc(manageHabitName(h))}</span>`).join('')}</div></div>` : ''}
      <div class="sd-section">
        <div class="sd-h">${esc(t('stat.trend'))}${showTrend && grew > 0 ? ` · <span style="color:var(${cvar})">${esc(t('stat.trendDelta', { n: grew }))}</span>` : ''}</div>
        ${showTrend ? `
          <svg class="chart-svg sd-trend" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
            <defs><linearGradient id="sdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(${cvar})" stop-opacity=".28"/><stop offset="1" stop-color="var(${cvar})" stop-opacity="0"/></linearGradient></defs>
            <path d="${area}" fill="url(#sdg)" stroke="none"/>
            <path d="${line}" fill="none" stroke="var(${cvar})" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            ${dots}
          </svg>
          <div class="sd-trend-x"><span>${esc(fmt(trend[0].key))}</span><span>${esc(fmt(trend[trend.length - 1].key))}</span></div>`
        : `<div class="empty" style="padding:18px">${esc(t('stat.noTrend'))}</div>`}
      </div>
    </div>`);
}
function homeHabitCard(h) {
  const p = habitProgress(h); const isAbst = h.type === 'bad' && h.mode === 'abstinence';
  const blur = h.private && isSensitiveHidden();
  const card = el('div', 'habit-card' + (h.type === 'good' && checkedToday(h) ? ' checked' : ''));
  card.style.setProperty('--_c', h.color);
  const badge = h.private ? `<span class="habit-card__badge">🔒 ${esc(t('habits.private'))}</span>`
    : (h.type === 'bad' ? `<span class="habit-card__badge bad">${isAbst ? '🔥 ' + t('habits.streak') : t('habits.limitWord') + ' ' + h.goal}</span>` : `<span class="habit-card__badge good">${esc(t('habits.goal'))} ${h.goal}</span>`);
  const unit = isAbst ? daysWord(p.current) : esc(h.unit);
  // One-tap action on the dashboard — same logic as the Habits tab.
  let action = '';
  if (!isAbst) {
    if (h.mode === 'done') action = `<button class="check-btn ${checkedToday(h) ? 'done' : ''}" data-hcheck aria-label="${esc(t('mission.done'))}">${checkedToday(h) ? '✓' : ''}</button>`;
    else action = `<button class="check-btn quick" data-hinc aria-label="＋">＋</button>`;
  }
  card.innerHTML = `
    <div class="habit-card__top"><div class="habit-card__ico">${h.icon}</div>${badge}</div>
    <div class="habit-card__name">${esc(homeHabitName(h))}</div>
    <div class="habit-card__row">
      <div class="habit-card__val ${blur ? 'blurred' : ''}"><span class="n">${p.current}</span><span class="u">${unit}</span></div>
      ${action}
    </div>`;
  card.onclick = () => go('habits');
  const chk = card.querySelector('[data-hcheck]');
  if (chk) chk.addEventListener('click', e => { e.stopPropagation(); habitCheckToggle(h); pop(chk); render(); });
  const inc = card.querySelector('[data-hinc]');
  if (inc) inc.addEventListener('click', e => { e.stopPropagation(); habitQuickAdd(h); pop(inc); render(); });
  return card;
}

/* Daily missions — reflects today's real actions, no separate XP source. */
function missionsCard() {
  const items = activeHabits().slice(0, 5).map(h => {
    let done, label;
    if (h.type === 'bad' && h.mode === 'abstinence') { done = true; label = manageHabitName(h) + ' — ' + t('habits.today'); }
    else if (h.mode === 'done') { done = checkedToday(h); label = manageHabitName(h); }
    else { done = todayValue(h) > 0; label = manageHabitName(h); }
    return { h, done, label };
  });
  const pending = items.filter(i => !i.done);
  const card = el('div', 'card mission-card'); card.style.marginTop = '14px';
  card.innerHTML = `<div style="padding:16px 18px"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3 style="margin:0;font-size:15px;font-weight:700">🎯 ${esc(t('mission.title'))}</h3><span class="muted" style="font-size:12px">${items.length - pending.length}/${items.length}</span></div>
    <p class="muted" style="font-size:12px;margin:4px 0 10px">${esc(t('mission.sub'))}</p><div id="missionList"></div></div>`;
  const list = card.querySelector('#missionList');
  const rows = pending.length ? pending : items;
  rows.slice(0, 5).forEach(m => {
    const r = el('div', 'mission-row');
    r.innerHTML = `<span class="mi-dot ${m.done ? 'done' : ''}"></span><span class="mi-label ${m.done ? 'strike' : ''}">${esc(m.label)}</span>${m.done ? '<span class="mi-check">✓</span>' : ''}`;
    r.onclick = () => go('habits');
    list.appendChild(r);
  });
  analyticsService.track('missions_viewed');
  return card;
}

/* ---------------------------------------------------------
   10. HABITS screen
--------------------------------------------------------- */
let habitTab = 'good';
screens.habits = () => {
  const wrap = el('section', 'screen');
  wrap.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin:6px 2px 10px">
      <h1 class="h1">${esc(t('habits.title'))}</h1>
      <button class="btn btn--sm btn--violet" id="addHabit">${esc(t('habits.add'))}</button>
    </div>
    <div class="tabs">
      <button class="tab ${habitTab === 'good' ? 'active' : ''}" data-tab="good">${esc(t('habits.good'))}</button>
      <button class="tab ${habitTab === 'bad' ? 'active' : ''}" data-tab="bad">${esc(t('habits.limit'))}</button>
      <button class="tab ${habitTab === 'archived' ? 'active' : ''}" data-tab="archived">${esc(t('habits.archive'))}</button>
    </div>`;
  const list = el('div', 'stagger'); list.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:14px';
  let items = habitTab === 'archived' ? archivedHabits() : activeHabits().filter(h => h.type === habitTab);
  if (!items.length) {
    if (habitTab === 'archived') list.appendChild(emptyState('🗄', t('habits.emptyArchT'), t('habits.emptyArchS')));
    else if (habitTab === 'bad') list.appendChild(emptyState('🛡', t('habits.emptyLimitT'), t('habits.emptyLimitS'), t('habits.fromCatalog'), openCatalog));
    else list.appendChild(emptyState('🌱', t('habits.emptyGoodT'), t('habits.emptyGoodS'), t('habits.fromCatalog'), openCatalog));
  } else items.forEach(h => list.appendChild(habitRow(h)));
  wrap.appendChild(list);
  wrap.querySelector('#addHabit').onclick = openCatalog;
  $$('.tab', wrap).forEach(tb => tb.onclick = () => { habitTab = tb.dataset.tab; render(); });
  return wrap;
};
function habitRow(h) {
  const p = habitProgress(h); const row = el('div', 'habit-row' + (h.archived ? ' archived' : '')); row.style.setProperty('--_c', h.color);
  const isAbst = h.type === 'bad' && h.mode === 'abstinence';
  const blur = h.private && isSensitiveHidden();
  const name = manageHabitName(h);
  let meta, action = '';
  if (h.archived) {
    meta = `<span class="archived-badge">${esc(t('habits.inArchive'))}</span><span>${isAbst ? t('habits.record') + ' ' + badBest(h) : logTotal(h) + ' ' + esc(h.unit)}</span>`;
    action = `<button class="btn btn--sm btn--ghost" data-restore>${esc(t('habits.restore'))}</button>`;
  } else if (isAbst) {
    const s = badStreak(h);
    meta = `<span class="flame">🔥 ${s} ${daysWord(s)}</span><span>${esc(t('habits.goal'))} ${h.goal}</span><span>${esc(t('habits.record'))} ${badBest(h)}</span>`;
    action = `<button class="btn btn--sm btn--ghost" style="border-color:rgba(255,107,107,.4);color:var(--red)" data-relapse>${esc(t('habits.relapse'))}</button>`;
  } else if (h.mode === 'done') {
    const done = checkedToday(h);
    meta = `<span class="flame">${logTotal(h)} / ${h.goal}</span><span>${esc(t('habits.streak'))} ${doneStreakDays(h)}</span>`;
    action = `<button class="check-btn ${done ? 'done' : ''}" data-check>${done ? '✓' : ''}</button>`;
  } else {
    const tv = todayValue(h);
    if (h.type === 'bad') { const over = tv > h.goal; meta = `<span class="flame" style="${over ? 'color:var(--red)' : ''}">${esc(t('habits.today'))} ${tv} / ${esc(t('habits.limitWord'))} ${h.goal} ${esc(h.unit)}</span>`; }
    else meta = `<span class="flame">${logTotal(h)} / ${h.goal} ${esc(h.unit)}</span><span>${esc(t('habits.today'))} +${tv}</span>`;
    action = `<div class="stepper"><button data-dec>−</button><span class="qv">${tv}</span><button data-inc>＋</button></div>`;
  }
  row.innerHTML = `
    <div class="habit-row__ico">${h.icon}</div>
    <div class="habit-row__body">
      <div class="habit-row__name ${blur ? 'blurred' : ''}">${esc(name)}${h.private ? ' <span class="priv-lock">🔒</span>' : ''}</div>
      <div class="habit-row__meta ${blur ? 'blurred' : ''}">${meta}</div>
      ${h.archived ? '' : `<div class="mini-track"><i style="width:${p.pct * 100}%"></i></div>`}
    </div>
    <div class="habit-row__action">${action}</div>
    <div class="habit-row__menu"><button class="icon-btn" data-menu aria-label="${esc(t('common.edit'))}">⋯</button></div>`;
  row.querySelector('[data-check]')?.addEventListener('click', e => {
    const btn = e.currentTarget, was = checkedToday(h);
    habitCheckToggle(h); if (!was) pop(btn); render();
  });
  row.querySelector('[data-inc]')?.addEventListener('click', () => { habitQuickAdd(h); render(); });
  row.querySelector('[data-dec]')?.addEventListener('click', () => { const cur = Number(h.log[todayKey()]) || 0; const nx = Math.max(0, cur - (h.step || 1)); if (nx === 0) delete h.log[todayKey()]; else h.log[todayKey()] = nx; h.updatedAt = todayKey(); save(); render(); });
  row.querySelector('[data-relapse]')?.addEventListener('click', () => confirmRelapse(h));
  row.querySelector('[data-restore]')?.addEventListener('click', () => { h.archived = false; save(); toast('info', '↩️', t('toast.restored'), ''); render(); });
  row.querySelector('[data-menu]').onclick = () => openHabitMenu(h);
  return row;
}
function openHabitMenu(h) {
  openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${esc(manageHabitName(h))}</h2><button class="modal__close" data-close>×</button></div>
    <div class="sheet-actions">
      <button class="sheet-action" data-edit><span class="sa-ico">✏️</span> ${esc(t('menu.edit'))}</button>
      <button class="sheet-action" data-priv><span class="sa-ico">${h.private ? '🔓' : '🔒'}</span> ${esc(h.private ? t('menu.makePublic') : t('menu.makePrivate'))}</button>
      ${h.archived ? `<button class="sheet-action" data-unarchive><span class="sa-ico">↩️</span> ${esc(t('menu.unarchive'))}</button>` : `<button class="sheet-action" data-archive><span class="sa-ico">🗄</span> ${esc(t('menu.archive'))}</button>`}
      <button class="sheet-action danger" data-delete><span class="sa-ico">🗑</span> ${esc(t('menu.delete'))}</button>
    </div>`);
  $('[data-edit]').onclick = () => { closeModal(); openHabitForm({ existing: h }); };
  $('[data-priv]').onclick = () => { h.private = !h.private; if (h.private && !h.alias) h.alias = t('form.aliasPh'); h.updatedAt = todayKey(); save(); closeModal(); render(); };
  $('[data-archive]')?.addEventListener('click', () => { h.archived = true; h.updatedAt = todayKey(); save(); closeModal(); toast('info', '🗄', t('toast.archived'), ''); render(); });
  $('[data-unarchive]')?.addEventListener('click', () => { h.archived = false; save(); closeModal(); toast('info', '↩️', t('toast.restored'), ''); render(); });
  $('[data-delete]').onclick = () => { closeModal(); confirmDeleteHabit(h); };
}
function confirmDeleteHabit(h) {
  openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(t('del.title'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(t('del.body', { name: manageHabitName(h) }))}</p>
    <div class="row mt24"><button class="btn btn--ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn--danger" id="doDelHabit">${esc(t('common.delete'))}</button></div>`);
  $('#doDelHabit').onclick = () => { state.habits = state.habits.filter(x => x.id !== h.id); save(); reconcileAchievements(); closeModal(); toast('info', '🗑', t('del.toast'), ''); render(); };
}
function confirmRelapse(h) {
  openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(t('rel.title'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(t('rel.body'))}</p>
    <div class="field"><label>${esc(t('rel.trigger'))}</label><div class="chips" id="relTriggers">${TRIGGERS.map(tr => `<button class="chip" data-t="${tr.id}">${tr.emoji} ${esc(t('trig.' + tr.id))}</button>`).join('')}</div></div>
    <div class="row mt24"><button class="btn btn--ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn--danger" id="doRelapse">${esc(t('rel.do'))}</button></div>`);
  let picked = null;
  $$('#relTriggers .chip').forEach(c => c.onclick = () => { $$('#relTriggers .chip').forEach(x => x.classList.remove('active')); c.classList.add('active'); picked = c.dataset.t; });
  $('#doRelapse').onclick = () => {
    h.relapses = h.relapses || []; h.relapses.push(todayKey()); h.updatedAt = todayKey();
    if (picked) { const k = todayKey(); const j = state.journal[k] || (state.journal[k] = { ...emptyJournal(), id: uid() }); j.triggers = [...new Set([...(j.triggers || []), picked])]; }
    save(); reconcileAchievements(); closeModal();
    toast('info', '💚', t('rel.toastT'), t('rel.toastS')); render();
  };
}

/* ---------------------------------------------------------
   11. Catalog + create/edit form
--------------------------------------------------------- */
const EMOJIS = ['🚫','✋','🍬','📱','🎮','🍺','🚭','🍔','⏳','🌙','🏃','🏋️','🧘','📚','📖','💧','😴','📝','🎯','☕','🤖','🚶','💪','🥗'];
const COLORS = ['#3DDC97','#4C8DFF','#A66BFF','#FFB84C','#FF6B6B','#FF8A4C','#2BBE82','#FF5FA2'];
// Templates carry bilingual name/desc.
const GOOD_TEMPLATES = [
  { name: { ru: 'Силовая тренировка', en: 'Strength training' }, icon: '🏋️', color: '#3DDC97', mode: 'count', goal: 3, unit: { ru: 'раз/нед', en: 'x/week' }, stat: 'strength', desc: { ru: 'Цель: 3 раза в неделю', en: 'Goal: 3 times a week' } },
  { name: { ru: 'Бег или кардио', en: 'Running / cardio' }, icon: '🏃', color: '#3DDC97', mode: 'count', goal: 3, unit: { ru: 'раз/нед', en: 'x/week' }, stat: 'strength', desc: { ru: 'Кардио 2–3 раза в неделю', en: 'Cardio 2–3 times a week' } },
  { name: { ru: 'Прогулка', en: 'Walk' }, icon: '🚶', color: '#4C8DFF', mode: 'duration', goal: 30, unit: { ru: 'мин', en: 'min' }, stat: 'discipline', desc: { ru: '30 минут в день', en: '30 minutes a day' } },
  { name: { ru: 'Учёба Java', en: 'Learn Java' }, icon: '☕', color: '#A66BFF', mode: 'duration', goal: 45, unit: { ru: 'мин', en: 'min' }, stat: 'knowledge', desc: { ru: '30–60 минут в день', en: '30–60 minutes a day' } },
  { name: { ru: 'Чтение', en: 'Reading' }, icon: '📖', color: '#4C8DFF', mode: 'count', goal: 10, unit: { ru: 'стр.', en: 'pages' }, stat: 'knowledge', desc: { ru: '10 страниц в день', en: '10 pages a day' } },
  { name: { ru: 'Режим сна', en: 'Sleep routine' }, icon: '😴', color: '#4C8DFF', mode: 'done', goal: 1, unit: { ru: 'раз', en: 'time' }, stat: 'discipline', desc: { ru: 'Лечь спать вовремя', en: 'Go to bed on time' } },
  { name: { ru: 'Вода', en: 'Water' }, icon: '💧', color: '#4C8DFF', mode: 'count', goal: 8, unit: { ru: 'стак.', en: 'glasses' }, stat: 'discipline', desc: { ru: 'Цель выбираешь сам', en: 'You set the goal' } },
  { name: { ru: 'Медитация', en: 'Meditation' }, icon: '🧘', color: '#3DDC97', mode: 'duration', goal: 10, unit: { ru: 'мин', en: 'min' }, stat: 'discipline', desc: { ru: '5–10 минут дыхания', en: '5–10 minutes of breathing' } },
  { name: { ru: 'Дневник и планирование', en: 'Journal & planning' }, icon: '📝', color: '#A66BFF', mode: 'done', goal: 1, unit: { ru: 'раз', en: 'time' }, stat: 'discipline', desc: { ru: 'Один раз в день', en: 'Once a day' } },
  { name: { ru: 'Полезное использование ИИ', en: 'Useful AI use' }, icon: '🤖', color: '#A66BFF', mode: 'done', goal: 1, unit: { ru: 'раз', en: 'time' }, stat: 'knowledge', desc: { ru: 'Одна полезная задача с ИИ в день', en: 'One useful AI task a day' } },
];
const LIMIT_TEMPLATES = [
  { name: { ru: 'Просмотр контента 18+', en: 'Adult content' }, icon: '🚫', color: '#FF6B6B', mode: 'abstinence', goal: 90, unit: { ru: 'дней', en: 'days' }, desc: { ru: 'Воздержание — считаем дни без', en: 'Abstinence — count days without' } },
  { name: { ru: 'Импульсивное поведение', en: 'Impulsive behavior' }, icon: '✋', color: '#FF8A4C', mode: 'abstinence', goal: 30, unit: { ru: 'дней', en: 'days' }, desc: { ru: 'Ты сам выбираешь цель контроля', en: 'You set your control goal' } },
  { name: { ru: 'Сладкое и сахар', en: 'Sweets & sugar' }, icon: '🍬', color: '#FFB84C', mode: 'count', goal: 2, unit: { ru: 'порц.', en: 'servings' }, desc: { ru: 'Лимит порций в день', en: 'Daily servings limit' } },
  { name: { ru: 'Бесконтрольный скроллинг', en: 'Doomscrolling' }, icon: '📱', color: '#A66BFF', mode: 'duration', goal: 30, unit: { ru: 'мин', en: 'min' }, desc: { ru: 'Shorts, Reels — лимит времени', en: 'Shorts, Reels — time limit' } },
  { name: { ru: 'Телефон перед сном', en: 'Phone before bed' }, icon: '🌙', color: '#4C8DFF', mode: 'done', goal: 1, unit: { ru: 'раз', en: 'time' }, desc: { ru: 'Не использовать перед сном', en: 'No phone before sleep' } },
  { name: { ru: 'Чрезмерные видеоигры', en: 'Excessive gaming' }, icon: '🎮', color: '#A66BFF', mode: 'duration', goal: 60, unit: { ru: 'мин', en: 'min' }, desc: { ru: 'Лимит игрового времени', en: 'Gaming time limit' } },
  { name: { ru: 'Прокрастинация', en: 'Procrastination' }, icon: '⏳', color: '#FFB84C', mode: 'done', goal: 1, unit: { ru: 'раз', en: 'time' }, desc: { ru: 'Главную задачу — до развлечений', en: 'Top task before fun' } },
  { name: { ru: 'Фастфуд или переедание', en: 'Fast food / overeating' }, icon: '🍔', color: '#FF8A4C', mode: 'count', goal: 1, unit: { ru: 'раз', en: 'time' }, desc: { ru: 'Лимит порций или дни без', en: 'Servings limit or days without' } },
  { name: { ru: 'Курение или вейп', en: 'Smoking / vaping' }, icon: '🚭', color: '#FF6B6B', mode: 'abstinence', goal: 30, unit: { ru: 'дней', en: 'days' }, desc: { ru: 'Воздержание или лимит', en: 'Abstinence or limit' } },
  { name: { ru: 'Алкоголь', en: 'Alcohol' }, icon: '🍺', color: '#FFB84C', mode: 'abstinence', goal: 30, unit: { ru: 'дней', en: 'days' }, desc: { ru: 'Воздержание или дни без', en: 'Abstinence or days without' } },
];
const loc = obj => (obj && typeof obj === 'object') ? (obj[getLang()] || obj.ru || obj.en || '') : obj;

function canAddHabit() { const lim = subscriptionService.limit('activeHabits'); return activeHabits().length < lim; }

let catalogTab = 'good';
function openCatalog() {
  if (!canAddHabit()) { openLimitReached(); return; }
  openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${esc(t('cat.title'))}</h2><button class="modal__close" data-close>×</button></div>
    <div class="tabs">
      <button class="tab ${catalogTab === 'good' ? 'active' : ''}" data-ctab="good">${esc(t('cat.good'))}</button>
      <button class="tab ${catalogTab === 'bad' ? 'active' : ''}" data-ctab="bad">${esc(t('cat.limit'))}</button>
      <button class="tab ${catalogTab === 'custom' ? 'active' : ''}" data-ctab="custom">${esc(t('cat.custom'))}</button>
    </div><div id="catalogBody"></div>`);
  const renderBody = () => {
    const body = $('#catalogBody');
    if (catalogTab === 'custom') {
      body.innerHTML = `<p class="data-hint" style="margin:14px 4px">${esc(t('cat.customHint'))}</p><button class="btn btn--primary btn--block" id="startCustom">${esc(t('cat.startCustom'))}</button>`;
      $('#startCustom').onclick = () => { closeModal(); openHabitForm({ type: 'good' }); }; return;
    }
    const templates = catalogTab === 'good' ? GOOD_TEMPLATES : LIMIT_TEMPLATES;
    body.innerHTML = `<div class="catalog-search"><span class="cs-ico">🔍</span><input class="input" id="tplSearch" placeholder="${esc(t('cat.search'))}"></div><div class="tpl-list" id="tplList"></div>`;
    const draw = (q = '') => {
      const listEl = $('#tplList');
      const f = templates.filter(tp => loc(tp.name).toLowerCase().includes(q.toLowerCase()) || loc(tp.desc).toLowerCase().includes(q.toLowerCase()));
      if (!f.length) { listEl.innerHTML = `<div class="empty" style="padding:24px">${esc(t('cat.nothing'))}</div>`; return; }
      listEl.innerHTML = f.map((tp, i) => `<div class="tpl" data-i="${templates.indexOf(tp)}" style="--_c:${tp.color}"><div class="tpl__ico">${tp.icon}</div><div class="tpl__body"><div class="tpl__name">${esc(loc(tp.name))}</div><div class="tpl__desc">${esc(loc(tp.desc))}</div></div><div class="tpl__add">＋</div></div>`).join('');
      $$('.tpl', listEl).forEach(card => card.onclick = () => { const tp = templates[+card.dataset.i]; closeModal(); openHabitForm({ template: tp, type: catalogTab }); });
    };
    draw(); $('#tplSearch').oninput = e => draw(e.target.value);
  };
  renderBody();
  $$('[data-ctab]').forEach(b => b.onclick = () => { catalogTab = b.dataset.ctab; $$('[data-ctab]').forEach(x => x.classList.toggle('active', x === b)); renderBody(); });
}
function openLimitReached() {
  const lim = subscriptionService.limit('activeHabits');
  openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(t('plan.limitReached'))}</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(t('plan.limitBody', { n: lim }))}</p>
    <div class="row mt24"><button class="btn btn--ghost" data-close>${esc(t('common.close'))}</button><button class="btn btn--violet" id="goPlans">${esc(t('plan.viewPlans'))}</button></div>`);
  $('#goPlans').onclick = () => { closeModal(); go('plans'); };
}
function openHabitForm(opts = {}) {
  const isEdit = !!opts.existing; const tpl = opts.template;
  const h = opts.existing || {
    name: tpl ? loc(tpl.name) : '', icon: tpl?.icon || '🎯', color: tpl?.color || COLORS[1],
    type: opts.type === 'custom' ? 'good' : (opts.type || 'good'), mode: tpl?.mode || 'done',
    goal: tpl?.goal || 1, unit: tpl ? loc(tpl.unit) : t('habits.today'), step: tpl?.mode === 'duration' ? 15 : 1,
    stat: tpl?.stat || null, startKey: todayKey(), private: false, alias: '',
  };
  const draft = { ...h };
  openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${esc(isEdit ? t('menu.edit') : t('form.setup'))}</h2><button class="modal__close" data-close>×</button></div>
    <div class="field"><label>${esc(t('form.name'))}</label><input class="input" id="hName" value="${esc(draft.name)}" placeholder="${esc(t('form.namePh'))}"></div>
    <div class="field"><label>${esc(t('form.type'))}</label><div class="chips">
      <button class="chip ${draft.type === 'good' ? 'active g' : ''}" data-type="good">${esc(t('form.typeGood'))}</button>
      <button class="chip ${draft.type === 'bad' ? 'active' : ''}" data-type="bad">${esc(t('form.typeLimit'))}</button></div></div>
    <div class="field"><label>${esc(t('form.mode'))}</label><div class="chips" id="modeChips"></div><div class="data-hint" id="modeHint" style="margin-left:2px"></div></div>
    <div class="field"><label>${esc(t('form.icon'))}</label><div class="picker-grid" id="emojiGrid">${EMOJIS.map(e => `<button data-e="${e}" class="${e === draft.icon ? 'active' : ''}">${e}</button>`).join('')}</div></div>
    <div class="field"><label>${esc(t('form.color'))}</label><div class="color-grid" id="colorGrid">${COLORS.map(c => `<button data-c="${c}" style="background:${c}" class="${c === draft.color ? 'active' : ''}"></button>`).join('')}</div></div>
    <div class="row"><div class="field"><label id="goalLabel">${esc(t('form.goal'))}</label><input class="input" id="hGoal" type="number" min="1" value="${draft.goal}"></div>
      <div class="field"><label>${esc(t('form.unit'))}</label><input class="input" id="hUnit" value="${esc(draft.unit)}"></div></div>
    <div class="field"><label>${esc(t('form.stat'))}</label><div class="chips" id="statChips">
      <button class="chip" data-stat="">${esc(t('form.statNone'))}</button>
      <button class="chip g" data-stat="discipline">🧠 ${esc(t('stat.discipline'))}</button>
      <button class="chip" data-stat="strength">💪 ${esc(t('stat.strength'))}</button>
      <button class="chip v" data-stat="knowledge">📚 ${esc(t('stat.knowledge'))}</button></div></div>
    <div class="field"><label>${esc(t('form.start'))}</label><input class="input" id="hStart" type="date" value="${draft.startKey}" max="${todayKey()}"></div>
    <div class="field toggle-field"><div><label style="margin:0">${esc(t('form.private'))}</label><div class="data-hint">${esc(t('form.privateHint'))}</div></div>
      <button class="switch ${draft.private ? 'on' : ''}" id="privToggle" role="switch" aria-checked="${draft.private}"></button></div>
    <div class="field ${draft.private ? '' : 'hidden'}" id="aliasField"><label>${esc(t('form.alias'))}</label><input class="input" id="hAlias" value="${esc(draft.alias)}" placeholder="${esc(t('form.aliasPh'))}"></div>
    <button class="btn btn--primary btn--block mt24" id="saveHabit">${esc(isEdit ? t('form.saveBtn') : t('form.addBtn'))}</button>`);

  const renderModes = () => {
    const modes = draft.type === 'bad' ? limitModes : goodModes;
    if (!modes.includes(draft.mode)) draft.mode = modes[0];
    $('#modeChips').innerHTML = modes.map(m => `<button class="chip ${draft.mode === m ? 'active' + (draft.type === 'good' ? ' g' : '') : ''}" data-mode="${m}">${esc(modeLabel(m))}</button>`).join('');
    $('#modeHint').textContent = modeHint(draft.mode);
    $$('#modeChips .chip').forEach(c => c.onclick = () => { draft.mode = c.dataset.mode; renderModes(); syncGoal(); });
  };
  const syncGoal = () => { const l = $('#goalLabel'); l.textContent = (draft.type === 'bad' && draft.mode === 'abstinence') ? t('form.goalDays') : (draft.type === 'bad' ? t('form.dailyLimit') : t('form.goal')); };
  const paintStat = () => $$('#statChips .chip').forEach(c => c.classList.toggle('active', (c.dataset.stat || '') === (draft.stat || '')));
  renderModes(); syncGoal(); paintStat();
  $$('[data-type]').forEach(b => b.onclick = () => { draft.type = b.dataset.type; $$('[data-type]').forEach(x => x.classList.remove('active', 'g')); b.classList.add('active'); if (draft.type === 'good') b.classList.add('g'); if (draft.type === 'bad' && draft.mode === 'abstinence') { draft.unit = getLang() === 'en' ? 'days' : 'дней'; $('#hUnit').value = draft.unit; } renderModes(); syncGoal(); });
  $$('#emojiGrid button').forEach(b => b.onclick = () => { $$('#emojiGrid button').forEach(x => x.classList.remove('active')); b.classList.add('active'); draft.icon = b.dataset.e; });
  $$('#colorGrid button').forEach(b => b.onclick = () => { $$('#colorGrid button').forEach(x => x.classList.remove('active')); b.classList.add('active'); draft.color = b.dataset.c; });
  $$('#statChips .chip').forEach(b => b.onclick = () => { draft.stat = b.dataset.stat || null; paintStat(); });
  $('#privToggle').onclick = () => { draft.private = !draft.private; $('#privToggle').classList.toggle('on', draft.private); $('#privToggle').setAttribute('aria-checked', draft.private); $('#aliasField').classList.toggle('hidden', !draft.private); };

  $('#saveHabit').onclick = () => {
    const name = $('#hName').value.trim();
    if (!name) { $('#hName').focus(); toast('info', '✏️', t('form.needName'), ''); return; }
    draft.name = name; draft.goal = Math.max(1, +$('#hGoal').value || 1);
    draft.unit = $('#hUnit').value.trim() || (draft.type === 'bad' && draft.mode === 'abstinence' ? (getLang() === 'en' ? 'days' : 'дней') : (getLang() === 'en' ? 'times' : 'раз'));
    draft.step = draft.mode === 'duration' ? (draft.step > 1 ? draft.step : 15) : 1;
    const sv = $('#hStart').value || todayKey(); draft.startKey = sv <= todayKey() ? sv : todayKey();
    draft.alias = $('#hAlias')?.value.trim() || (draft.private ? t('form.aliasPh') : '');
    if (isEdit) {
      Object.assign(opts.existing, { name: draft.name, icon: draft.icon, color: draft.color, type: draft.type, mode: draft.mode, goal: draft.goal, unit: draft.unit, step: draft.step, stat: draft.stat, startKey: draft.startKey, originAt: draft.startKey, private: draft.private, alias: draft.alias, updatedAt: todayKey() });
      save(); toast('info', '✏️', t('toast.habitUpdated'), '');
    } else {
      if (!canAddHabit()) { closeModal(); openLimitReached(); return; }
      state.habits.push({ id: uid(), name: draft.name, description: '', icon: draft.icon, color: draft.color, type: draft.type, mode: draft.mode, goal: draft.goal, unit: draft.unit, step: draft.step, stat: draft.stat, startKey: draft.startKey, originAt: draft.startKey, relapses: [], log: {}, archived: false, private: draft.private, alias: draft.alias, pinned: false, order: state.habits.length, createdAt: todayKey(), updatedAt: todayKey() });
      save(); habitTab = draft.type; analyticsService.track('habit_created', { count: state.habits.length }); toast('info', '🎯', t('toast.habitAdded'), '');
    }
    checkAchievements(); closeModal(); render();
  };
}

/* ---------------------------------------------------------
   12. Daily journal
--------------------------------------------------------- */
const TRIGGERS = [
  { id: 'boredom', emoji: '🥱' }, { id: 'stress', emoji: '😰' }, { id: 'lonely', emoji: '🌑' },
  { id: 'tired', emoji: '😴' }, { id: 'night', emoji: '🌙' }, { id: 'social', emoji: '📲' }, { id: 'mood', emoji: '☔' },
];
const emptyJournal = () => ({ mood: 5, energy: 5, sleepH: 7, sleepQ: 3, urge: 3, good: '', hard: '', helped: '', notes: '', triggers: [] });
function openJournalModal() {
  const key = todayKey(); const wasFilled = !!state.journal[key]; const j = { ...emptyJournal(), ...(state.journal[key] || {}) };
  openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${esc(t('home.journalTitle'))}</h2><button class="modal__close" data-close>×</button></div>
    ${slider(t('stats.mood'), 'mood', j.mood, 1, 10, '')}
    ${slider(t('stats.energy'), 'energy', j.energy, 1, 10, 'g')}
    ${hasLimitContext() ? slider(t('journal.urge'), 'urge', j.urge, 1, 10, 'r') : ''}
    <div class="row"><div class="field"><label>${esc(t('journal.sleepH'))}</label><input class="input" type="number" id="jSleepH" min="0" max="14" step="0.5" value="${j.sleepH}"></div>
      <div class="field"><label>${esc(t('journal.sleepQ'))}</label><div class="scale-row" id="jSleepQ">${[1,2,3,4,5].map(n => `<button class="${j.sleepQ === n ? 'active' : ''}" data-q="${n}">${n}</button>`).join('')}</div></div></div>
    <div class="field"><label>${esc(t('journal.good'))}</label><textarea class="textarea" id="jGood">${esc(j.good)}</textarea></div>
    <div class="field"><label>${esc(t('journal.hard'))}</label><textarea class="textarea" id="jHard">${esc(j.hard)}</textarea></div>
    <div class="field"><label>${esc(t('journal.helped'))}</label><textarea class="textarea" id="jHelped">${esc(j.helped)}</textarea></div>
    <div class="field"><label>${esc(t('journal.triggers'))}</label><div class="chips" id="jTriggers">${TRIGGERS.map(tr => `<button class="chip ${(j.triggers || []).includes(tr.id) ? 'active' : ''}" data-t="${tr.id}">${tr.emoji} ${esc(t('trig.' + tr.id))}</button>`).join('')}</div></div>
    <div class="field"><label>${esc(t('journal.notes'))}</label><textarea class="textarea" id="jNotes">${esc(j.notes)}</textarea></div>
    <button class="btn btn--blue btn--block mt24" id="saveJournal">${esc(t('common.save'))}</button>`);
  bindSlider('mood', j); bindSlider('energy', j); bindSlider('urge', j);
  $$('#jSleepQ button').forEach(b => b.onclick = () => { $$('#jSleepQ button').forEach(x => x.classList.remove('active')); b.classList.add('active'); j.sleepQ = +b.dataset.q; });
  $$('#jTriggers .chip').forEach(c => c.onclick = () => { c.classList.toggle('active'); const id = c.dataset.t; if (c.classList.contains('active')) j.triggers = [...new Set([...(j.triggers || []), id])]; else j.triggers = (j.triggers || []).filter(x => x !== id); });
  $('#saveJournal').onclick = () => {
    j.sleepH = clamp(+$('#jSleepH').value || 0, 0, 24); j.good = $('#jGood').value.trim(); j.hard = $('#jHard').value.trim(); j.helped = $('#jHelped').value.trim(); j.notes = $('#jNotes').value.trim();
    withXp(() => {
      const prev = state.journal[key];               // update same day, never duplicate
      const nowISO = new Date().toISOString();
      state.journal[key] = { ...j, id: prev?.id || j.id || uid(), date: key, createdAt: prev?.createdAt || nowISO, updatedAt: nowISO };
    }, wasFilled ? null : t('home.journalTitle'));
    closeModal(); render();
  };
}
function slider(label, key, val, min, max, cls) { return `<div class="field"><label>${esc(label)}</label><div class="slider-row"><input class="range ${cls}" type="range" id="s_${key}" min="${min}" max="${max}" value="${val}" step="1"><span class="range-val" id="v_${key}">${val}</span></div></div>`; }
function bindSlider(key, obj) { const r = $('#s_' + key), v = $('#v_' + key); if (!r) return; r.oninput = () => { v.textContent = r.value; obj[key] = +r.value; }; }

/* --- Journal history --- */
function formatJournalDate(k) {
  try { return keyToDate(k).toLocaleDateString(getLang() === 'en' ? 'en-US' : 'ru-RU', { weekday: 'short', day: 'numeric', month: 'long' }); }
  catch { return k; }
}
const MOOD_EMOJI = ['😔', '😔', '🙁', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩'];
const moodEmoji = n => MOOD_EMOJI[clamp(Math.round(n) - 1, 0, 9)] || '😐';

screens.journalHistory = () => {
  const wrap = el('section', 'screen');
  wrap.innerHTML = `<div class="subhead"><button class="icon-btn" id="backBtn" aria-label="${esc(t('common.back'))}">‹</button><h1 class="h1">${esc(t('jh.title'))}</h1></div>`;
  const keys = Object.keys(state.journal).sort().reverse(); // newest → oldest
  if (!keys.length) {
    wrap.appendChild(emptyState('📓', t('jh.empty'), t('jh.emptySub'), t('home.open'), openJournalModal));
  } else {
    const list = el('div', 'stagger'); list.style.cssText = 'display:flex;flex-direction:column;gap:12px;margin-top:6px';
    keys.forEach(k => list.appendChild(journalHistoryRow(k, state.journal[k])));
    wrap.appendChild(list);
  }
  wrap.querySelector('#backBtn').onclick = () => go('profile');
  return wrap;
};
function journalHistoryRow(k, e) {
  const row = el('div', 'card jh-row');
  const short = (e.good || e.notes || e.hard || e.helped || '').trim();
  const shortTxt = short ? (short.length > 90 ? esc(short.slice(0, 90)) + '…' : esc(short)) : `<span class="muted">${esc(t('jh.noText'))}</span>`;
  const trigs = (e.triggers || []).map(id => { const tr = TRIGGERS.find(x => x.id === id); return tr ? `<span class="jh-trig">${tr.emoji} ${esc(t('trig.' + id))}</span>` : ''; }).join('');
  const isToday = k === todayKey();
  row.innerHTML = `
    <div class="jh-head"><span class="jh-date">${esc(formatJournalDate(k))}${isToday ? ` · ${esc(t('jh.today'))}` : ''}</span><span class="jh-emoji">${moodEmoji(e.mood)}</span></div>
    <div class="jh-metrics">
      <span class="jh-metric">${esc(t('stats.mood'))} <b>${e.mood}</b></span>
      <span class="jh-metric">${esc(t('stats.energy'))} <b>${e.energy}</b></span>
      <span class="jh-metric">${esc(t('journal.urge'))} <b>${e.urge}</b></span>
      <span class="jh-metric">😴 <b>${e.sleepH}${getLang() === 'en' ? 'h' : 'ч'}</b> · ${e.sleepQ}/5</span>
    </div>
    ${trigs ? `<div class="jh-trigs">${trigs}</div>` : ''}
    <div class="jh-text">${shortTxt}</div>`;
  row.onclick = () => openJournalView(k);
  return row;
}
function openJournalView(k) {
  const e = state.journal[k]; if (!e) return;
  const section = (label, val) => val && val.trim() ? `<div class="field"><label>${esc(label)}</label><div class="jh-note">${esc(val)}</div></div>` : '';
  const trigs = (e.triggers || []).map(id => { const tr = TRIGGERS.find(x => x.id === id); return tr ? `<span class="chip active" style="pointer-events:none">${tr.emoji} ${esc(t('trig.' + id))}</span>` : ''; }).join('');
  openModal('sheet', `
    <div class="modal__head"><h2 class="h2">${esc(formatJournalDate(k))}</h2><button class="modal__close" data-close aria-label="${esc(t('common.close'))}">×</button></div>
    <div class="jh-view-metrics">
      <div class="jh-vm"><div class="jh-vm-em">${moodEmoji(e.mood)}</div><div class="jh-vm-n">${e.mood}</div><div class="jh-vm-l">${esc(t('stats.mood'))}</div></div>
      <div class="jh-vm"><div class="jh-vm-em">⚡</div><div class="jh-vm-n">${e.energy}</div><div class="jh-vm-l">${esc(t('stats.energy'))}</div></div>
      <div class="jh-vm"><div class="jh-vm-em">🌀</div><div class="jh-vm-n">${e.urge}</div><div class="jh-vm-l">${esc(t('journal.urge'))}</div></div>
      <div class="jh-vm"><div class="jh-vm-em">😴</div><div class="jh-vm-n">${e.sleepH}</div><div class="jh-vm-l">${esc(t('journal.sleepH'))} · ${e.sleepQ}/5</div></div>
    </div>
    ${trigs ? `<div class="field"><label>${esc(t('journal.triggers'))}</label><div class="chips">${trigs}</div></div>` : ''}
    ${section(t('journal.good'), e.good)}
    ${section(t('journal.hard'), e.hard)}
    ${section(t('journal.helped'), e.helped)}
    ${section(t('journal.notes'), e.notes)}
    ${k === todayKey() ? `<button class="btn btn--blue btn--block mt24" id="jhEdit">${esc(t('common.edit'))}</button>` : ''}`);
  $('#jhEdit')?.addEventListener('click', () => { closeModal(); openJournalModal(); });
}

/* ---------------------------------------------------------
   13. STATS
--------------------------------------------------------- */
screens.stats = () => {
  const wrap = el('section', 'screen');
  wrap.innerHTML = `<h1 class="h1" style="margin:6px 2px 14px">${esc(t('stats.title'))}</h1>`;
  // Until the user has actually done something, show one friendly starter
  // state instead of a screen full of zeros and repeated "no data" blocks.
  if (!hasActivity()) {
    if (!activeHabits().length) wrap.appendChild(emptyState('📊', t('stats.emptyT'), t('stats.emptyS'), t('empty.addHabit'), openCatalog));
    else wrap.appendChild(emptyState('🌱', t('start.beginning'), t('stats.startedS'), t('stats.doFirst'), () => go('habits')));
    return wrap;
  }
  const a = aggregateStats();
  const hero = el('div', 'stat-hero stagger');
  hero.innerHTML = metric('green', t('stats.cleanDays'), a.cleanDays, t('stats.cleanDaysSub')) + metric('amber', t('stats.relapses'), a.relapses, t('stats.relapsesSub')) + metric('blue', t('stats.workouts'), a.workouts, t('stats.workoutsSub')) + metric('violet', t('stats.journalRec'), a.journalDays, t('stats.journalRecSub'));
  wrap.appendChild(hero);
  wrap.appendChild(weeklyReportCard());
  wrap.appendChild(lineChartCard());
  wrap.appendChild(barChartCard());
  wrap.appendChild(triggerCard());
  return wrap;
};
function metric(cls, lbl, val, sub) { return `<div class="card metric ${cls}"><div class="lbl">${esc(lbl)}</div><div class="val">${val}</div><div class="sub">${esc(sub)}</div></div>`; }
function weeklyReportCard() {
  const card = el('div', 'card chart-card');
  card.innerHTML = `<h3>${esc(t('stats.weekly'))}</h3><div class="hint">${esc(t('stats.weeklySub'))}</div>`;
  const days = []; for (let i = 6; i >= 0; i--) days.push(todayKey(new Date(Date.now() - i * DAY)));
  const js = days.map(k => state.journal[k]).filter(Boolean);
  const checkins = state.habits.reduce((s, h) => { const log = h.log || {}; return s + days.filter(k => (h.mode === 'done' ? !!log[k] : (Number(log[k]) || 0) > 0)).length; }, 0);
  const rows = [];
  if (js.length) rows.push([t('stats.journalRec'), js.length]);
  if (js.length) rows.push([t('stats.mood'), (js.reduce((s, j) => s + j.mood, 0) / js.length).toFixed(1)]);
  if (js.length) rows.push([t('stats.energy'), (js.reduce((s, j) => s + j.energy, 0) / js.length).toFixed(1)]);
  if (checkins) rows.push([t('nav.habits'), checkins]);
  if (!rows.length) { card.innerHTML += `<div class="empty" style="padding:20px">${esc(t('common.noData'))}</div>`; return card; }
  card.innerHTML += `<div class="backup-summary" style="margin-top:12px">${rows.map(r => `<div class="bs-row"><span>${esc(r[0])}</span><span>${r[1]}</span></div>`).join('')}</div>`;
  analyticsService.track('report_viewed');
  return card;
}
function lineChartCard() {
  const card = el('div', 'card chart-card');
  const days = []; for (let i = 13; i >= 0; i--) days.push(todayKey(new Date(Date.now() - i * DAY)));
  const mood = days.map(k => state.journal[k]?.mood ?? null); const energy = days.map(k => state.journal[k]?.energy ?? null);
  const has = mood.some(v => v != null) || energy.some(v => v != null);
  card.innerHTML = `<h3>${esc(t('stats.moodEnergy'))}</h3><div class="hint">${esc(t('stats.last14'))}</div>`;
  if (!has) { card.innerHTML += `<div class="empty" style="padding:24px"><div class="em">📈</div>${esc(t('common.noData'))}</div>`; return card; }
  const W = 320, H = 130, pad = 6; const x = i => pad + (i * (W - 2 * pad) / 13); const y = v => H - pad - ((v - 1) / 9) * (H - 2 * pad);
  const path = arr => { let d = '', st = false; arr.forEach((v, i) => { if (v == null) { st = false; return; } d += (st ? ' L' : ' M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); st = true; }); return d.trim(); };
  card.innerHTML += `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${path(mood)}" fill="none" stroke="#4C8DFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="${path(energy)}" fill="none" stroke="#3DDC97" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${mood.map((v, i) => v != null ? `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="#4C8DFF"/>` : '').join('')}${energy.map((v, i) => v != null ? `<circle cx="${x(i)}" cy="${y(v)}" r="2.6" fill="#3DDC97"/>` : '').join('')}</svg>
    <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:var(--text-dim)"><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#4C8DFF;margin-right:5px"></i>${esc(t('stats.mood'))}</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#3DDC97;margin-right:5px"></i>${esc(t('stats.energy'))}</span></div>`;
  return card;
}
function barChartCard() {
  const card = el('div', 'card chart-card');
  const abst = activeHabits().filter(h => h.type === 'bad' && h.mode === 'abstinence');
  card.innerHTML = `<h3>${esc(t('stats.progressDays'))}</h3><div class="hint">${esc(t('stats.progressSub'))}</div>`;
  if (!abst.length) { card.innerHTML += `<div class="empty" style="padding:24px"><div class="em">🛡</div>${esc(t('common.noData'))}</div>`; return card; }
  const max = Math.max(1, ...abst.map(badStreak)); const bars = el('div', 'bars');
  abst.forEach(h => { const s = badStreak(h); const bar = el('div', 'bar'); bar.style.background = `linear-gradient(180deg, ${h.color}, ${h.color}99)`; bar.style.height = '4px'; bars.appendChild(bar); requestAnimationFrame(() => { bar.style.height = clamp((s / max) * 100, 4, 100) + '%'; }); });
  const xax = el('div', 'bars-x'); abst.forEach(h => xax.appendChild(el('span', '', h.icon)));
  card.appendChild(bars); card.appendChild(xax); return card;
}
function triggerCard() {
  const card = el('div', 'card chart-card');
  card.innerHTML = `<h3>${esc(t('stats.triggers'))}</h3><div class="hint">${esc(t('stats.triggersSub'))}</div>`;
  const counts = {}; Object.values(state.journal).forEach(j => (j.triggers || []).forEach(tr => counts[tr] = (counts[tr] || 0) + 1));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) { card.innerHTML += `<div class="empty" style="padding:24px"><div class="em">🧭</div>${esc(t('common.noData'))}</div>`; return card; }
  const sorted = TRIGGERS.map(tr => ({ ...tr, c: counts[tr.id] || 0 })).sort((a, b) => b.c - a.c);
  const max = Math.max(...sorted.map(s => s.c));
  sorted.forEach(tr => { if (!tr.c) return; const it = el('div', 'trigger-item'); it.innerHTML = `<span class="tname">${tr.emoji} ${esc(t('trig.' + tr.id))}</span><span class="tbar"><i style="width:0"></i></span><span class="tval">${tr.c}</span>`; card.appendChild(it); requestAnimationFrame(() => it.querySelector('i').style.width = (tr.c / max * 100) + '%'); });
  const nightPct = Math.round(((counts['night'] || 0) + (counts['tired'] || 0)) / total * 100);
  const msg = nightPct >= 35 ? t('insight.evening') : t('insight.top', { name: t('trig.' + sorted[0].id) });
  const ins = el('div', 'insight'); ins.innerHTML = `<div class="ico">💡</div><p>${esc(msg)}</p>`; card.appendChild(ins);
  return card;
}

/* ---------------------------------------------------------
   14. ACHIEVEMENTS
--------------------------------------------------------- */
let achFilter = 'all';
screens.achievements = () => {
  const wrap = el('section', 'screen');
  const unlocked = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
  wrap.innerHTML = `<h1 class="h1" style="margin:6px 2px 4px">${esc(t('ach.title'))}</h1><p class="section-sub">${esc(t('ach.progress', { n: unlocked, total: ACHIEVEMENTS.length }))}</p>`;
  const filters = el('div', 'ach-filters');
  filters.innerHTML = `<button class="chip ${achFilter === 'all' ? 'active' : ''}" data-f="all">${esc(t('ach.all'))}</button>` + ACH_CATS.map(c => `<button class="chip ${achFilter === c ? 'active' : ''}" data-f="${c}">${esc(t('cat.' + c))}</button>`).join('');
  wrap.appendChild(filters);
  const grid = el('div', 'ach-grid stagger');
  const shown = ACHIEVEMENTS.filter(a => achFilter === 'all' || a.cat === achFilter);
  shown.forEach(a => {
    const { cur, pct } = achProgress(a); const isU = !!state.achievements[a.id];
    const name = a.hidden && !isU ? '???' : achName(a);
    const desc = a.hidden && !isU ? t('acd.hidden') : achDesc(a);
    const cell = el('div', 'ach ' + (isU ? 'unlocked' : 'locked'));
    cell.innerHTML = `<div class="ach__ico">${isU ? a.icon : '🔒'}</div><div class="ach__name">${esc(name)}</div><div class="ach__desc">${esc(desc)}</div>${isU ? `<div class="ach__status">${esc(t('ach.unlocked'))}</div>` : (a.hidden ? `<div class="ach__status">???</div>` : `<div class="ach__prog"><i style="width:${pct * 100}%"></i></div><div class="ach__status">${Math.min(cur, a.target)} / ${a.target}</div>`)}`;
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  $$('[data-f]', filters).forEach(b => b.onclick = () => { achFilter = b.dataset.f; render(); });
  return wrap;
};

/* ---------------------------------------------------------
   15. PROFILE
--------------------------------------------------------- */
screens.profile = () => {
  const wrap = el('section', 'screen');
  const xp = currentXp(); const lv = levelFromXp(xp);
  wrap.innerHTML = `
    <div class="profile-head" style="margin-top:6px">
      <div class="avatar">${esc(userAvatar())}</div>
      <div class="profile-head__meta"><div class="profile-head__name">${esc(userDisplayName())}</div>
      <div class="profile-head__sub">Level ${lv.level} · ${esc(levelTitle(lv.level))} · ${xp} XP</div></div>
    </div>`;
  // Account / cloud sync — populated by the cloud module if present (else stays hidden)
  const cloudCard = el('div', 'card list-card');
  cloudCard.id = 'cloudAccount';
  cloudCard.style.cssText = 'margin-bottom:14px;display:none';
  wrap.appendChild(cloudCard);
  if (window.AscendCloud && window.AscendCloud.mountAccount) window.AscendCloud.mountAccount(cloudCard);
  // Path
  const milestones = [
    { day: 1, ttl: t('path.d1t'), desc: t('path.d1d') }, { day: 7, ttl: t('path.d7t'), desc: t('path.d7d') },
    { day: 30, ttl: t('path.d30t'), desc: t('path.d30d') }, { day: 90, ttl: t('path.d90t'), desc: t('path.d90d') },
  ];
  const path = el('div', 'card', `<div style="padding:18px"><h2 class="h2" style="margin-bottom:14px">${esc(t('profile.path'))}</h2><div class="timeline" id="tl"></div></div>`);
  wrap.appendChild(path);
  const tl = path.querySelector('#tl'); const ref = Math.max(aggregateStats().bestStreak, daysSinceCreated());
  milestones.forEach((m, i) => { const reached = ref >= m.day; const next = milestones[i + 1]; const cur = reached && (!next || ref < next.day); const it = el('div', 'tl-item ' + (cur ? 'current' : reached ? 'reached' : '')); it.innerHTML = `<div class="tl-day">${esc(t('path.day'))} ${m.day}</div><div class="tl-ttl">${esc(m.ttl)}</div><div class="tl-desc">${esc(m.desc)}</div>`; tl.appendChild(it); });
  // Reasons
  const reasons = el('div', 'card'); reasons.style.marginTop = '14px';
  reasons.innerHTML = `<div style="padding:18px"><h2 class="h2" style="margin-bottom:6px">${esc(t('profile.reasons'))}</h2><p class="muted" style="font-size:13px;margin:0 0 10px">${esc(t('profile.reasonsSub'))}</p><div id="reasonsList"></div><div class="row mt12"><input class="input" id="newReason" placeholder="${esc(t('profile.addReason'))}"><button class="btn btn--sm btn--primary" id="addReason" style="flex:0 0 auto">＋</button></div></div>`;
  wrap.appendChild(reasons);
  const rlist = reasons.querySelector('#reasonsList');
  const drawReasons = () => { rlist.innerHTML = state.reasons.length ? state.reasons.map((r, i) => `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--stroke)"><span style="flex:1;font-size:14px">🎯 ${esc(r)}</span><button data-r="${i}" style="background:none;border:none;color:var(--text-faint);cursor:pointer;font-size:16px">×</button></div>`).join('') : `<p class="muted" style="font-size:13px">${esc(t('profile.reasonsEmpty'))}</p>`; $$('[data-r]', rlist).forEach(b => b.onclick = () => { state.reasons.splice(+b.dataset.r, 1); save(); drawReasons(); }); };
  drawReasons();
  reasons.querySelector('#addReason').onclick = () => { const inp = reasons.querySelector('#newReason'); const v = inp.value.trim(); if (v) { state.reasons.push(v); save(); inp.value = ''; drawReasons(); } };
  // Nav list
  const nav = el('div', 'card list-card'); nav.style.marginTop = '14px';
  nav.innerHTML = `
    <div class="list-item" id="goSettings"><div class="li-ico">⚙️</div><div class="li-body"><div class="li-ttl">${esc(t('profile.settings'))}</div><div class="li-sub">${esc(t('set.language'))} · ${esc(t('set.theme'))} · ${esc(t('set.privacyScreen'))}</div></div><div class="li-arrow">›</div></div>
    <div class="list-item" id="goPlans"><div class="li-ico">💎</div><div class="li-body"><div class="li-ttl">${esc(t('profile.plan'))}</div><div class="li-sub">${esc(t('profile.planSub', { plan: t(planFor(settings().plan).nameKey) }))}</div></div><div class="li-arrow">›</div></div>
    <div class="list-item" id="openJ2"><div class="li-ico">📓</div><div class="li-body"><div class="li-ttl">${esc(t('profile.fillJournal'))}</div><div class="li-sub">${state.journal[todayKey()] ? esc(t('profile.jToday')) : esc(t('profile.jNot'))}</div></div><div class="li-arrow">›</div></div>
    <div class="list-item" id="journalHist"><div class="li-ico">🗓️</div><div class="li-body"><div class="li-ttl">${esc(t('jh.title'))}</div><div class="li-sub">${esc(t('jh.count', { n: Object.keys(state.journal).length }))}</div></div><div class="li-arrow">›</div></div>`;
  wrap.appendChild(nav);
  nav.querySelector('#journalHist').onclick = () => go('journalHistory');
  nav.querySelector('#goSettings').onclick = () => go('settings');
  nav.querySelector('#goPlans').onclick = () => go('plans');
  nav.querySelector('#openJ2').onclick = openJournalModal;
  // Data management
  wrap.appendChild(sectionTitle(t('profile.dataMgmt')));
  const data = el('div', 'card list-card');
  data.innerHTML = `
    <div class="list-item" id="backupExport"><div class="li-ico">⬇️</div><div class="li-body"><div class="li-ttl">${esc(t('data.export'))}</div><div class="li-sub">${esc(t('data.exportSub'))}</div></div><div class="li-arrow">›</div></div>
    <div class="list-item" id="backupImport"><div class="li-ico">⬆️</div><div class="li-body"><div class="li-ttl">${esc(t('data.import'))}</div><div class="li-sub">${esc(t('data.importSub'))}</div></div><div class="li-arrow">›</div></div>
    <div class="list-item" id="resetBtn"><div class="li-ico">♻️</div><div class="li-body"><div class="li-ttl" style="color:var(--amber)">${esc(t('data.reset'))}</div><div class="li-sub">${esc(t('data.resetSub'))}</div></div><div class="li-arrow">›</div></div>
    <div class="list-item" id="wipeBtn"><div class="li-ico">🗑</div><div class="li-body"><div class="li-ttl" style="color:var(--red)">${esc(t('data.wipe'))}</div><div class="li-sub">${esc(t('data.wipeSub'))}</div></div><div class="li-arrow">›</div></div>`;
  wrap.appendChild(data);
  data.querySelector('#backupExport').onclick = doExport;
  data.querySelector('#backupImport').onclick = openImportDialog;
  data.querySelector('#resetBtn').onclick = openResetProgress;
  data.querySelector('#wipeBtn').onclick = openDeleteAll;
  wrap.appendChild(el('p', 'data-hint', t('data.hint')));
  return wrap;
};

/* Settings screen */
screens.settings = () => {
  const wrap = el('section', 'screen');
  const s = settings();
  wrap.innerHTML = `<div class="subhead"><button class="icon-btn" id="backBtn">‹</button><h1 class="h1">${esc(t('set.title'))}</h1></div>`;
  // Profile
  wrap.appendChild(sectionTitle(t('set.section.profile')));
  const prof = el('div', 'card'); prof.style.padding = '4px';
  prof.innerHTML = `<div class="list-item" id="editProfile"><div class="li-ico">✏️</div><div class="li-body"><div class="li-ttl">${esc(t('set.editProfile'))}</div><div class="li-sub">${esc(userDisplayName())} · ${esc(userMotto())}</div></div><div class="li-arrow">›</div></div>`;
  wrap.appendChild(prof);
  prof.querySelector('#editProfile').onclick = openNameModal;
  // Preferences
  wrap.appendChild(sectionTitle(t('set.section.prefs')));
  const prefs = el('div', 'card'); prefs.style.padding = '14px 16px';
  prefs.appendChild(selectRow(t('set.language'), LANGS.map(l => ({ v: l.id, label: l.flag + ' ' + l.label })), s.language, v => { setLang(v); s.language = v; save(); applyStaticI18n(); toast('info', '🌐', t('toast.langChanged'), ''); go('settings'); }));
  prefs.appendChild(selectRow(t('set.theme'), [{ v: 'dark', label: '🌙 Dark' }], s.theme, v => { s.theme = v; save(); }));
  prefs.appendChild(selectRow(t('set.animations'), [{ v: 'full', label: t('anim.full') }, { v: 'reduced', label: t('anim.reduced') }, { v: 'off', label: t('anim.off') }], s.animations, v => { s.animations = v; save(); applyAnimationLevel(); }));
  prefs.appendChild(selectRow(t('set.firstDay'), [{ v: 1, label: t('day.mon') }, { v: 0, label: t('day.sun') }], s.firstDay, v => { s.firstDay = +v; save(); }));
  prefs.appendChild(selectRow(t('set.timeFormat'), [{ v: '24', label: t('tf.24') }, { v: '12', label: t('tf.12') }], s.timeFormat, v => { s.timeFormat = v; save(); }));
  prefs.appendChild(toggleRow(t('set.missions'), '', s.missions, v => { s.missions = v; save(); }));
  prefs.appendChild(toggleRow(t('set.notifications'), '', s.notifications, async v => { s.notifications = v; save(); if (v) await notificationService.requestPermission(); }));
  wrap.appendChild(prefs);
  // Privacy
  wrap.appendChild(sectionTitle(t('set.section.privacy')));
  const priv = el('div', 'card'); priv.style.padding = '14px 16px';
  priv.appendChild(toggleRow(t('set.privacyScreen'), t('set.privacyScreenHint'), s.privacyScreen, v => { s.privacyScreen = v; sensitiveRevealed = false; save(); }));
  wrap.appendChild(priv);
  wrap.querySelector('#backBtn').onclick = () => go('profile');
  return wrap;
};
function selectRow(label, options, value, onChange) {
  const row = el('div', 'setting-row');
  row.innerHTML = `<div class="sr-label">${esc(label)}</div><div class="seg" role="group">${options.map(o => `<button class="seg-btn ${String(o.v) === String(value) ? 'active' : ''}" data-v="${o.v}">${esc(o.label)}</button>`).join('')}</div>`;
  $$('.seg-btn', row).forEach(b => b.onclick = () => { $$('.seg-btn', row).forEach(x => x.classList.remove('active')); b.classList.add('active'); onChange(b.dataset.v); });
  return row;
}
function toggleRow(label, hint, value, onChange) {
  const row = el('div', 'setting-row toggle-field');
  row.innerHTML = `<div><div class="sr-label">${esc(label)}</div>${hint ? `<div class="data-hint">${esc(hint)}</div>` : ''}</div><button class="switch ${value ? 'on' : ''}" role="switch" aria-checked="${value}"></button>`;
  row.querySelector('.switch').onclick = e => { const on = !e.currentTarget.classList.contains('on'); e.currentTarget.classList.toggle('on', on); e.currentTarget.setAttribute('aria-checked', on); onChange(on); };
  return row;
}
function openNameModal() {
  openModal('center', `
    <div class="modal__head"><h2 class="h2">${esc(t('set.section.profile'))}</h2><button class="modal__close" data-close>×</button></div>
    <div class="field"><label>${esc(t('set.displayName'))} <span class="muted" style="font-weight:400">· ${esc(t('set.displayNameHint'))}</span></label><input class="input" id="pName" value="${esc(state.user.name)}" placeholder="${esc(t('app.you'))}"></div>
    <div class="field"><label>${esc(t('set.motto'))}</label><input class="input" id="pMotto" value="${esc(state.user.motto)}" placeholder="${esc(t('app.tagline'))}"></div>
    <button class="btn btn--primary btn--block mt24" id="savePname">${esc(t('common.save'))}</button>`);
  $('#savePname').onclick = () => { state.user.name = $('#pName').value.trim(); state.user.motto = $('#pMotto').value.trim(); state.user.avatar = (state.user.name[0] || '').toUpperCase(); save(); closeModal(); render(); };
}

/* Plans screen (config-driven, no payments) */
screens.plans = () => {
  analyticsService.track('plans_viewed');
  const wrap = el('section', 'screen');
  const cur = settings().plan || 'free';
  wrap.innerHTML = `<div class="subhead"><button class="icon-btn" id="backBtn">‹</button><h1 class="h1">${esc(t('plan.title'))}</h1></div><p class="section-sub">${esc(t('plan.sub'))}</p>`;
  wrap.appendChild(planCard(PLANS.free, cur === 'free'));
  wrap.appendChild(planCard(PLANS.premium_monthly, cur !== 'free', true));
  const life = el('div', 'card plan-card'); life.style.opacity = '.7'; life.style.marginTop = '12px';
  life.innerHTML = `<div class="plan-head"><div class="plan-name">${esc(t('plan.lifetime.name'))}</div><span class="plan-soon">${esc(t('common.soon'))}</span></div><div class="plan-price">$${PLANS.lifetime.price.once}</div>`;
  wrap.appendChild(life);
  wrap.appendChild(el('p', 'data-hint', t('plan.paymentsSoon')));
  wrap.querySelector('#backBtn').onclick = () => go('profile');
  return wrap;
};
function planCard(plan, isCurrent, premium) {
  const card = el('div', 'card plan-card' + (premium ? ' premium' : ''));
  card.style.marginTop = '12px';
  const price = premium ? `$${plan.price.monthly}<span>/${t('plan.month')}</span>` : (getLang() === 'en' ? 'Free' : 'Бесплатно');
  card.innerHTML = `
    <div class="plan-head"><div class="plan-name">${esc(t(plan.nameKey))}</div>${isCurrent ? `<span class="plan-badge">${esc(t('plan.current'))}</span>` : ''}</div>
    <div class="plan-price">${price}</div>
    <div class="plan-features">${plan.featureKeys.map(k => `<div class="plan-feat"><span>✓</span>${esc(t(k))}</div>`).join('')}</div>
    ${premium && !isCurrent ? `<button class="btn btn--violet btn--block mt16" id="choosePremium">${esc(t('plan.choose'))}</button>` : ''}`;
  card.querySelector('#choosePremium')?.addEventListener('click', () => { const r = subscriptionService.startCheckout(); toast('info', '💎', t('plan.paymentsSoon'), ''); });
  return card;
}

/* ---------------------------------------------------------
   16. Data management actions
--------------------------------------------------------- */
function doExport() {
  const payload = StorageService.exportData(state);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a');
  a.href = url; a.download = `ascend-backup-${todayKey()}.json`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('info', '⬇️', t('toast.exported'), t('data.privacyExportWarn'));
}
function openImportDialog() {
  const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = () => {
    const file = input.files && input.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = StorageService.importData(String(reader.result || ''));
      if (!res.ok) { openModal('center', `<div class="modal__head"><h2 class="h2">${esc(t('import.errT'))}</h2><button class="modal__close" data-close>×</button></div><p class="danger-note">${esc(t('import.errBody'))}</p><button class="btn btn--ghost btn--block mt16" data-close>${esc(t('common.close'))}</button>`); return; }
      const s = res.summary; const when = s.exportedAt ? new Date(s.exportedAt).toLocaleString() : '—';
      openModal('center', `<div class="modal__head"><h2 class="h2">${esc(t('import.confirmT'))}</h2><button class="modal__close" data-close>×</button></div>
        <p class="danger-note">${esc(t('import.confirmBody'))}</p>
        <div class="backup-summary"><div class="bs-row"><span>${esc(t('import.created'))}</span><span>${esc(when)}</span></div><div class="bs-row"><span>${esc(t('nav.habits'))}</span><span>${s.habits}</span></div><div class="bs-row"><span>${esc(t('stats.journalRec'))}</span><span>${s.journalDays}</span></div><div class="bs-row"><span>${esc(t('ach.title'))}</span><span>${s.achievements}</span></div></div>
        <div class="row mt24"><button class="btn btn--ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn--blue" id="doImport">${esc(t('import.restore'))}</button></div>`);
      $('#doImport').onclick = () => { state = res.state; StorageService.saveState(state); showSaved(); setLang(settings().language || 'ru'); applyStaticI18n(); applyAnimationLevel(); reconcileAchievements(); checkAchievements(true); closeModal(); go('home'); toast('ach', '✅', t('toast.imported'), ''); };
    };
    reader.onerror = () => toast('info', '⚠️', t('import.errBody'), '');
    reader.readAsText(file);
  };
  input.click();
}
function openResetProgress() {
  openModal('center', `<div class="modal__head"><h2 class="h2">${esc(t('data.reset'))}?</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(t('reset.body'))}</p>
    <div class="row mt24"><button class="btn btn--ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn--danger" id="doReset">${esc(t('data.reset'))}</button></div>`);
  $('#doReset').onclick = () => { state = StorageService.resetProgress(state); showSaved(); sensitiveRevealed = false; closeModal(); go('home'); toast('info', '♻️', t('toast.reset'), ''); };
}
function openDeleteAll() {
  openModal('center', `<div class="modal__head"><h2 class="h2">${esc(t('data.wipe'))}?</h2><button class="modal__close" data-close>×</button></div>
    <p class="danger-note">${esc(t('wipe.body'))}</p>
    <div class="field"><label>${esc(t('wipe.confirm'))} <b>${esc(t('wipe.word'))}</b></label><input class="input confirm-word" id="wipeWord" autocomplete="off" placeholder="${esc(t('wipe.word'))}"></div>
    <div class="auth-msg err" id="wipeErr" style="min-height:0"></div>
    <div class="row mt24"><button class="btn btn--ghost" data-close>${esc(t('common.cancel'))}</button><button class="btn btn--danger" id="doWipe" disabled style="opacity:.5">${esc(t('data.wipe'))}</button></div>`);
  const inp = $('#wipeWord'), btn = $('#doWipe'), err = $('#wipeErr');
  inp.oninput = () => { const ok = inp.value.trim().toUpperCase() === t('wipe.word'); btn.disabled = !ok; btn.style.opacity = ok ? '1' : '.5'; err.textContent = ''; };
  btn.onclick = async () => {
    if (inp.value.trim().toUpperCase() !== t('wipe.word')) return;
    const C = window.AscendCloud;
    // If signed in, delete the cloud row FIRST and wait for success. Only clear local
    // data if the cloud delete succeeded — otherwise keep everything and show an error.
    if (C && C.isSignedIn && C.isSignedIn()) {
      btn.disabled = true; btn.style.opacity = '.6'; err.textContent = t('wipe.deleting');
      let res; try { res = await C.deleteCloudData(); } catch { res = { ok: false }; }
      if (!res || !res.ok) { btn.disabled = false; btn.style.opacity = '1'; err.textContent = t('wipe.cloudErr'); return; }
    }
    // Cloud row removed (or local-only mode): clear local + sync metadata, keep the
    // user authenticated (session/token are preserved by deleteAllData).
    state = StorageService.deleteAllData();
    if (C && C.afterLocalWipe) C.afterLocalWipe();
    showSaved(); closeModal(); habitTab = 'good'; catalogTab = 'good'; sensitiveRevealed = false;
    setLang(settings().language); applyStaticI18n(); applyAnimationLevel(); startOnboarding(); render();
    toast('info', '🗑', t('toast.wiped'), '');
  };
}

/* ---------------------------------------------------------
   17. CRISIS mode
--------------------------------------------------------- */
let crisisTimer = null, crisisBreath = null, crisisRemaining = 600;
function openCrisis() {
  let host = $('#crisisScreen'); if (!host) { host = el('div', 'crisis'); host.id = 'crisisScreen'; document.body.appendChild(host); }
  const reason = state.reasons.length ? state.reasons[Math.floor(Math.random() * state.reasons.length)] : t('crisis.defaultReason');
  crisisRemaining = 600;
  host.innerHTML = `
    <div class="crisis__inner">
      <button class="crisis__close" id="crisisClose">×</button>
      <h1 class="crisis__title">${esc(t('crisis.title'))}</h1>
      <p class="crisis__sub">${esc(t('crisis.sub'))}<br>${esc(t('crisis.sub2'))}</p>
      <div class="breath"><div class="breath__orb"></div><div class="breath__label" id="breathLabel">${esc(t('breath.in'))}</div></div>
      <div class="crisis__timer" id="crisisTimer">10:00</div>
      <div class="crisis__timer-lbl">${esc(t('crisis.timerLbl'))}</div>
      <div class="why-box"><div class="lbl">${esc(t('crisis.why'))}</div><div class="txt">${esc(reason)}</div></div>
      <div class="quick-grid">
        <div class="quick-act" data-q><div class="ico">💪</div><div class="lbl">${esc(t('qa.pushups'))}</div></div>
        <div class="quick-act" data-q><div class="ico">🚶</div><div class="lbl">${esc(t('qa.walk'))}</div></div>
        <div class="quick-act" data-q><div class="ico">🚿</div><div class="lbl">${esc(t('qa.shower'))}</div></div>
        <div class="quick-act" data-q><div class="ico">🎧</div><div class="lbl">${esc(t('qa.music'))}</div></div>
        <div class="quick-act" data-q><div class="ico">📚</div><div class="lbl">${esc(t('qa.study'))}</div></div>
        <div class="quick-act" data-q><div class="ico">📞</div><div class="lbl">${esc(t('qa.call'))}</div></div>
      </div>
      <button class="btn btn--primary btn--block mt24" id="crisisWin">${esc(t('crisis.win'))}</button>
    </div>`;
  requestAnimationFrame(() => host.classList.add('open'));
  const label = $('#breathLabel'); const phases = [t('breath.in'), t('breath.hold'), t('breath.out'), t('breath.pause')]; let pi = 0;
  crisisBreath = setInterval(() => { pi = (pi + 1) % phases.length; label.textContent = phases[pi]; }, 2000);
  crisisTimer = setInterval(() => { crisisRemaining--; const m = Math.floor(crisisRemaining / 60), s = crisisRemaining % 60; const el2 = $('#crisisTimer'); if (el2) el2.textContent = `${m}:${String(s).padStart(2, '0')}`; if (crisisRemaining <= 0) { clearInterval(crisisTimer); if (el2) el2.textContent = t('crisis.held'); } }, 1000);
  const close = () => { clearInterval(crisisTimer); clearInterval(crisisBreath); host.classList.remove('open'); };
  $('#crisisClose').onclick = close;
  $$('#crisisScreen .quick-act').forEach(q => q.onclick = () => { pop(q); toast('info', '🔥', t('qa.toastT'), t('qa.toastS')); });
  $('#crisisWin').onclick = () => { close(); withXp(() => { state.crisisWins.push({ id: uid(), dateKey: todayKey() }); }, t('crisis.wonT')); toast('ach', '🛡', t('crisis.wonT'), t('crisis.wonS')); render(); };
}

/* ---------------------------------------------------------
   18. Onboarding
--------------------------------------------------------- */
function startOnboarding() {
  const root = $('#onboardingRoot');
  const draft = { goals: [], habits: [], name: '', language: settings().language, animations: settings().animations, missions: true, notifications: false, privacyScreen: false, mode: 'local' };
  let step = 0; const TOTAL = 6;
  root.classList.add('open'); root.setAttribute('aria-hidden', 'false');

  const finish = (skipped) => {
    if (!skipped) {
      state.goals = draft.goals;
      state.user.name = draft.name.trim();
      state.user.avatar = (draft.name.trim()[0] || '').toUpperCase();
      settings().language = draft.language; settings().animations = draft.animations;
      settings().missions = draft.missions; settings().notifications = draft.notifications;
      settings().privacyScreen = draft.privacyScreen; settings().accountType = 'guest';
      // add selected habits (no auto-add before confirmation; no artificial XP)
      draft.habits.forEach(sel => {
        const tpl = sel.list === 'good' ? GOOD_TEMPLATES[sel.i] : LIMIT_TEMPLATES[sel.i];
        state.habits.push({ id: uid(), name: loc(tpl.name), description: '', icon: tpl.icon, color: tpl.color, type: sel.list, mode: tpl.mode, goal: tpl.goal, unit: loc(tpl.unit), step: tpl.mode === 'duration' ? 15 : 1, stat: tpl.stat || null, startKey: todayKey(), originAt: todayKey(), relapses: [], log: {}, archived: false, private: false, alias: '', pinned: false, order: state.habits.length, createdAt: todayKey(), updatedAt: todayKey() });
      });
    }
    settings().onboarded = true;
    save(); setLang(settings().language); applyStaticI18n(); applyAnimationLevel();
    checkAchievements(true);        // claim creation-time achievements silently → first real action pops just one
    root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); root.innerHTML = '';
    analyticsService.track('onboarding_complete');
    go('home');
  };

  const draw = () => {
    root.innerHTML = `<div class="ob"><div class="ob__inner" id="obInner"></div></div>`;
    const inner = $('#obInner');
    const progress = step > 0 ? `<div class="ob-progress"><div class="ob-dots">${Array.from({ length: TOTAL - 1 }, (_, i) => `<span class="${i < step ? 'on' : ''}"></span>`).join('')}</div><span class="ob-step">${esc(t('ob.step', { n: step, total: TOTAL - 1 }))}</span></div>` : '';

    if (step === 0) {
      inner.innerHTML = `<div class="ob-hero"><div class="ob-logo">⛰️</div><h1 class="ob-title">${esc(t('ob.w.title'))}</h1><p class="ob-desc">${esc(t('ob.w.desc'))}</p></div>
        <div class="ob-actions"><button class="btn btn--primary btn--block" id="obStart">${esc(t('ob.w.start'))}</button><button class="btn btn--ghost btn--block mt12" id="obSkip">${esc(t('ob.w.skip'))}</button></div>`;
      $('#obStart').onclick = () => { step = 1; draw(); };
      $('#obSkip').onclick = () => finish(true);
      return;
    }
    if (step === 1) {
      inner.innerHTML = `${progress}<h1 class="ob-title sm">${esc(t('ob.goals.title'))}</h1><p class="ob-desc">${esc(t('ob.goals.desc'))}</p>
        <div class="ob-goals">${ONBOARDING_GOALS.map(g => `<button class="ob-goal ${draft.goals.includes(g.id) ? 'on' : ''}" data-g="${g.id}"><span class="og-em">${g.emoji}</span><span>${esc(t(g.key))}</span></button>`).join('')}</div>
        ${obNav('obBack', 'obNext')}`;
      $$('.ob-goal').forEach(b => b.onclick = () => { const id = b.dataset.g; if (draft.goals.includes(id)) draft.goals = draft.goals.filter(x => x !== id); else draft.goals.push(id); b.classList.toggle('on'); });
      $('#obBack').onclick = () => { step = 0; draw(); }; $('#obNext').onclick = () => { step = 2; draw(); };
      return;
    }
    if (step === 2) {
      const chip = (list, i, tp) => { const on = draft.habits.some(s => s.list === list && s.i === i); return `<button class="tpl ob-tpl ${on ? 'on' : ''}" data-list="${list}" data-i="${i}" style="--_c:${tp.color}"><div class="tpl__ico">${tp.icon}</div><div class="tpl__body"><div class="tpl__name">${esc(loc(tp.name))}</div><div class="tpl__desc">${esc(loc(tp.desc))}</div></div><div class="tpl__add">${on ? '✓' : '＋'}</div></button>`; };
      inner.innerHTML = `${progress}<h1 class="ob-title sm">${esc(t('ob.habits.title'))}</h1><p class="ob-desc">${esc(t('ob.habits.desc'))}</p>
        <div class="ob-scroll"><div class="ob-cat">${esc(t('cat.good'))}</div><div class="tpl-list">${GOOD_TEMPLATES.map((tp, i) => chip('good', i, tp)).join('')}</div>
        <div class="ob-cat" style="margin-top:14px">${esc(t('cat.limit'))}</div><div class="tpl-list">${LIMIT_TEMPLATES.map((tp, i) => chip('bad', i, tp)).join('')}</div>
        <p class="data-hint" style="margin-top:12px">${esc(t('ob.habits.none'))}</p></div>${obNav('obBack', 'obNext')}`;
      $$('.ob-tpl').forEach(b => b.onclick = () => { const list = b.dataset.list, i = +b.dataset.i; const idx = draft.habits.findIndex(s => s.list === list && s.i === i); if (idx >= 0) draft.habits.splice(idx, 1); else draft.habits.push({ list, i }); b.classList.toggle('on'); const add = b.querySelector('.tpl__add'); if (add) add.textContent = b.classList.contains('on') ? '✓' : '＋'; });
      $('#obBack').onclick = () => { step = 1; draw(); }; $('#obNext').onclick = () => { step = 3; draw(); };
      return;
    }
    if (step === 3) {
      inner.innerHTML = `${progress}<h1 class="ob-title sm">${esc(t('ob.person.title'))}</h1><p class="ob-desc">${esc(t('ob.person.desc'))}</p>
        <div class="field"><label>${esc(t('set.displayName'))} <span class="muted">· ${esc(t('set.displayNameHint'))}</span></label><input class="input" id="obName" value="${esc(draft.name)}" placeholder="${esc(t('app.you'))}"></div>
        <div class="ob-scroll">
        <div class="setting-row"><div class="sr-label">${esc(t('set.language'))}</div><div class="seg">${LANGS.map(l => `<button class="seg-btn ${draft.language === l.id ? 'active' : ''}" data-lang="${l.id}">${l.flag} ${esc(l.label)}</button>`).join('')}</div></div>
        <div class="setting-row"><div class="sr-label">${esc(t('set.animations'))}</div><div class="seg">${[['full', t('anim.full')], ['reduced', t('anim.reduced')], ['off', t('anim.off')]].map(([v, l]) => `<button class="seg-btn ${draft.animations === v ? 'active' : ''}" data-anim="${v}">${esc(l)}</button>`).join('')}</div></div>
        <div class="setting-row toggle-field"><div class="sr-label">${esc(t('set.missions'))}</div><button class="switch ${draft.missions ? 'on' : ''}" id="obMissions"></button></div>
        <div class="setting-row toggle-field"><div class="sr-label">${esc(t('set.notifications'))}</div><button class="switch ${draft.notifications ? 'on' : ''}" id="obNotif"></button></div>
        </div>${obNav('obBack', 'obNext')}`;
      $('#obName').oninput = e => draft.name = e.target.value;
      $$('[data-lang]').forEach(b => b.onclick = () => { draft.language = b.dataset.lang; setLang(draft.language); $$('[data-lang]').forEach(x => x.classList.toggle('active', x === b)); draw(); });
      $$('[data-anim]').forEach(b => b.onclick = () => { draft.animations = b.dataset.anim; $$('[data-anim]').forEach(x => x.classList.toggle('active', x === b)); });
      $('#obMissions').onclick = e => { draft.missions = !draft.missions; e.currentTarget.classList.toggle('on', draft.missions); };
      $('#obNotif').onclick = e => { draft.notifications = !draft.notifications; e.currentTarget.classList.toggle('on', draft.notifications); };
      $('#obBack').onclick = () => { step = 2; draw(); }; $('#obNext').onclick = () => { step = 4; draw(); };
      return;
    }
    if (step === 4) {
      inner.innerHTML = `${progress}<h1 class="ob-title sm">${esc(t('ob.priv.title'))}</h1><p class="ob-desc">${esc(t('ob.priv.desc'))}</p>
        <button class="ob-mode ${draft.mode === 'local' ? 'on' : ''}" data-mode="local"><div class="om-ic">📱</div><div><div class="om-t">${esc(t('ob.priv.local'))}</div><div class="om-d">${esc(t('ob.priv.localDesc'))}</div></div></button>
        <button class="ob-mode disabled" data-mode="cloud"><div class="om-ic">☁️</div><div><div class="om-t">${esc(t('ob.priv.cloud'))} <span class="plan-soon">${esc(t('common.soon'))}</span></div><div class="om-d">${esc(t('ob.priv.cloudDesc'))}</div></div></button>
        ${obNav('obBack', 'obNext')}`;
      $$('[data-mode]').forEach(b => b.onclick = () => { if (b.dataset.mode === 'cloud') return; draft.mode = 'local'; $$('[data-mode]').forEach(x => x.classList.toggle('on', x === b && x.dataset.mode === 'local')); });
      $('#obBack').onclick = () => { step = 3; draw(); }; $('#obNext').onclick = () => { step = 5; draw(); };
      return;
    }
    // step 5 — done
    const goalNames = draft.goals.map(g => t(ONBOARDING_GOALS.find(x => x.id === g).key));
    inner.innerHTML = `${progress}<div class="ob-hero"><div class="ob-logo">🎉</div><h1 class="ob-title">${esc(t('ob.done.title'))}</h1><p class="ob-desc">${esc(t('ob.done.desc'))}</p></div>
      <div class="ob-summary">
        ${goalNames.length ? `<div class="obs-block"><div class="obs-h">${esc(t('ob.done.goals'))}</div><div class="obs-chips">${goalNames.map(n => `<span class="obs-chip">${esc(n)}</span>`).join('')}</div></div>` : ''}
        ${draft.habits.length ? `<div class="obs-block"><div class="obs-h">${esc(t('ob.done.habits'))}</div><div class="obs-chips">${draft.habits.map(s => { const tp = s.list === 'good' ? GOOD_TEMPLATES[s.i] : LIMIT_TEMPLATES[s.i]; return `<span class="obs-chip">${tp.icon} ${esc(loc(tp.name))}</span>`; }).join('')}</div></div>` : ''}
        <div class="obs-block"><div class="obs-h">${esc(t('ob.done.firstGoal'))}</div><div class="obs-goal">🎯 ${esc(t('ob.done.firstGoalText'))}</div></div>
      </div>
      <div class="ob-actions"><button class="btn btn--primary btn--block" id="obFinish">${esc(t('ob.done.enter'))}</button></div>`;
    $('#obFinish').onclick = () => finish(false);
  };
  const obNav = (backId, nextId) => `<div class="ob-nav"><button class="btn btn--ghost" id="${backId}">${esc(t('common.back'))}</button><button class="btn btn--primary" id="${nextId}">${esc(t('common.next'))}</button></div>`;
  draw();
}

/* ---------------------------------------------------------
   19. Modals, toasts, effects
--------------------------------------------------------- */
let _lastFocus = null;
function openModal(kind, html) {
  const root = $('#modalRoot');
  if (root._trap) { document.removeEventListener('keydown', root._trap); root._trap = null; } // avoid listener leak if a modal opens over another
  _lastFocus = document.activeElement;
  root.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal ${kind === 'center' ? 'modal--center' : ''}" role="dialog" aria-modal="true">${kind === 'sheet' ? '<div class="modal__grip"></div>' : ''}${html}</div>`;
  root.classList.add('open'); root.setAttribute('aria-hidden', 'false');
  $$('[data-close]', root).forEach(b => b.onclick = closeModal);
  const focusable = $$('input,button,textarea,select,[tabindex]:not([tabindex="-1"])', root).filter(e => !e.disabled);
  if (focusable[0]) setTimeout(() => { const f = root.querySelector('.modal__close') || focusable[0]; f.focus(); }, 40);
  root._trap = e => {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    const els = $$('input,button,textarea,select,[tabindex]:not([tabindex="-1"])', root).filter(x => !x.disabled && x.offsetParent !== null);
    if (!els.length) return;
    const first = els[0], last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', root._trap);
}
function closeModal() {
  const root = $('#modalRoot');
  if (root._trap) { document.removeEventListener('keydown', root._trap); root._trap = null; }
  root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); root.innerHTML = '';
  if (_lastFocus && _lastFocus.focus) { try { _lastFocus.focus(); } catch {} }
}
function toast(kind, ico, title, sub) {
  const el2 = el('div', 'toast ' + kind);
  el2.setAttribute('role', 'status');
  el2.innerHTML = `<div class="ti">${ico}</div><div><div class="tt">${esc(title)}</div>${sub ? `<div class="ts">${esc(sub)}</div>` : ''}</div>`;
  $('#toastRoot').appendChild(el2); setTimeout(() => el2.remove(), 3600);
}
// Overlays (achievements, level-ups) are queued so only ONE big window shows
// at a time — the next appears after the current one is closed.
let _ovQueue = [], _ovActive = false;
function unlockOverlay(icon, kicker, name) { _ovQueue.push({ icon, kicker, name }); drainOverlays(); }
function drainOverlays() {
  if (_ovActive || !_ovQueue.length) return;
  _ovActive = true;
  const { icon, kicker, name } = _ovQueue.shift();
  const ov = el('div', 'unlock-overlay');
  ov.innerHTML = `<div class="unlock-card"><div class="burst">${icon}</div><div class="kicker">${esc(kicker)}</div><div class="name">${esc(name)}</div><div class="desc">${esc(t('ach.unlockedDesc'))}</div><button class="btn btn--primary btn--block mt16" id="ovClose">${esc(t('common.done'))} 🎉</button></div>`;
  document.body.appendChild(ov); confetti();
  const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); _ovActive = false; setTimeout(drainOverlays, 260); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  ov.querySelector('#ovClose').addEventListener('click', close);
  ov.addEventListener('click', e => { if (e.target === ov) close(); });
  document.addEventListener('keydown', onKey);
}
function confetti() {
  if (settings().animations === 'off') return;
  const c = el('div', 'confetti'); const colors = ['#3DDC97', '#4C8DFF', '#A66BFF', '#FFB84C', '#FF6B6B'];
  for (let i = 0; i < 60; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + 'vw'; p.style.background = colors[i % colors.length]; p.style.animationDuration = (1.6 + Math.random() * 1.6) + 's'; p.style.animationDelay = Math.random() * 0.5 + 's'; p.style.transform = `rotate(${Math.random() * 360}deg)`; c.appendChild(p); }
  document.body.appendChild(c); setTimeout(() => c.remove(), 3600);
}
function pop(elm) { if (settings().animations === 'off') return; elm.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' }); }

/* ---------------------------------------------------------
   20. i18n / animation appliers
--------------------------------------------------------- */
function applyStaticI18n() {
  $$('[data-i18n]').forEach(e => { e.textContent = t(e.getAttribute('data-i18n')); });
  $$('[data-i18n-aria]').forEach(e => { e.setAttribute('aria-label', t(e.getAttribute('data-i18n-aria'))); });
  document.documentElement.lang = getLang();
}
function applyAnimationLevel() { document.body.classList.remove('anim-reduced', 'anim-off'); const a = settings().animations; if (a === 'reduced') document.body.classList.add('anim-reduced'); if (a === 'off') document.body.classList.add('anim-off'); }

/* ---------------------------------------------------------
   20b. Diagnostics (dev only) — window.runSelfCheck()
   Validates state integrity WITHOUT ever exposing journal text,
   private habit names, or notes. No production UI is attached.
--------------------------------------------------------- */
function runSelfCheck() {
  const issues = [];
  const add = (code, msg) => issues.push({ code, msg });
  const isDate = k => typeof k === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(k);
  const s = state, today = todayKey();

  if (s.schemaVersion !== SCHEMA_VERSION) add('schema', `schemaVersion ${s.schemaVersion} != ${SCHEMA_VERSION}`);
  if (!s.user || typeof s.user !== 'object') add('user', 'user missing');
  if (!s.user?.id) add('user.id', 'user.id missing');
  if (!s.settings || typeof s.settings !== 'object') add('settings', 'settings missing');
  if (!Array.isArray(s.habits)) add('habits', 'habits not array');
  if (!s.journal || typeof s.journal !== 'object') add('journal', 'journal not object');
  if (!s.achievements || typeof s.achievements !== 'object') add('achievements', 'achievements not object');
  if (!Array.isArray(s.crisisWins)) add('crisisWins', 'crisisWins not array');
  if (!isDate(s.createdKey)) add('createdKey', 'createdKey invalid');

  const habitIds = new Set();
  for (const h of (s.habits || [])) {
    if (!h.id) add('habit.id', 'habit without id');
    else if (habitIds.has(h.id)) add('habit.dupId', `duplicate habit id ${h.id}`); else habitIds.add(h.id);
    if (typeof h.name !== 'string' || !h.name.length) add('habit.name', `habit ${h.id} empty name`);
    if (!(Number(h.goal) > 0) || !isFinite(h.goal)) add('habit.goal', `habit ${h.id} goal not positive`);
    if (!(Number(h.step) > 0)) add('habit.step', `habit ${h.id} step not positive`);
    if (h.startKey && !isDate(h.startKey)) add('habit.startKey', `habit ${h.id} bad startKey`);
    for (const k in (h.log || {})) {
      if (!isDate(k)) add('log.date', `habit ${h.id} log date invalid`);
      else if (k > today) add('log.future', `habit ${h.id} future log`);
      const v = h.log[k];
      if (typeof v === 'number' && (!isFinite(v) || v < 0)) add('log.value', `habit ${h.id} bad log value`);
    }
    for (const r of (h.relapses || [])) if (!isDate(r)) add('relapse.date', `habit ${h.id} bad relapse date`);
  }

  const jIds = new Set();
  for (const k in s.journal) {
    if (!isDate(k)) add('journal.dateKey', 'journal has non-date key');       // keys are dates → no per-day duplicates possible
    const e = s.journal[k] || {};
    if (!e.id) add('journal.id', `journal ${k} without id`);
    else if (jIds.has(e.id)) add('journal.dupId', `duplicate journal id`); else jIds.add(e.id);
    for (const f of ['mood', 'energy', 'urge', 'sleepH', 'sleepQ']) {
      const v = e[f]; if (typeof v === 'number' && (!isFinite(v) || v < 0)) add('journal.value', `journal ${k} bad ${f}`);
    }
  }

  const cIds = new Set();
  for (const c of (s.crisisWins || [])) {
    if (!c || !c.id) add('crisis.id', 'crisis win without id');
    else if (cIds.has(c.id)) add('crisis.dupId', 'duplicate crisis id'); else cIds.add(c.id);
    if (c && c.dateKey && !isDate(c.dateKey)) add('crisis.date', 'crisis bad date');
  }

  const known = new Set(ACHIEVEMENTS.map(a => a.id));
  for (const id in s.achievements) {
    if (!known.has(id)) add('ach.unknown', `unknown achievement ${id}`);
    const at = s.achievements[id]?.unlockedAt;
    if (at && !isDate(at)) add('ach.date', `achievement ${id} bad unlockedAt`);
  }

  const xp = computeXp();
  if (!isFinite(xp) || xp < 0) add('xp', 'xp invalid');
  const st = characterStats();
  for (const k in st) if (!isFinite(st[k]) || st[k] < 0 || st[k] > 100) add('stat', `stat ${k} out of range`);
  const lvl = levelFromXp(xp).level;
  if (!isFinite(lvl) || lvl < 1) add('level', 'level invalid');

  // Sync metadata invariants (non-sensitive fields only).
  let meta = null;
  try { meta = JSON.parse(localStorage.getItem('ascend_sync_meta') || 'null'); } catch { add('sync.meta', 'sync meta not parseable'); }
  if (meta && typeof meta === 'object') {
    if ('revision' in meta && meta.revision != null && (typeof meta.revision !== 'number' || !isFinite(meta.revision) || meta.revision < 0)) add('sync.revision', 'sync revision invalid');
    if ('pendingLocal' in meta && typeof meta.pendingLocal !== 'boolean') add('sync.pendingLocal', 'pendingLocal not boolean');
    if ('userId' in meta && meta.userId != null && typeof meta.userId !== 'string') add('sync.userId', 'sync userId invalid');
  }

  const result = { ok: issues.length === 0, issues, summary: { schemaVersion: s.schemaVersion, habits: (s.habits || []).length, journalDays: Object.keys(s.journal || {}).length, achievements: Object.keys(s.achievements || {}).length, crisisWins: (s.crisisWins || []).length, xp, level: lvl, syncMeta: meta ? { revision: meta.revision ?? null, pendingLocal: !!meta.pendingLocal, hasUser: !!meta.userId } : null } };
  return result; // no journal text / private names / notes / tokens are ever included
}
if (typeof window !== 'undefined') window.runSelfCheck = runSelfCheck;

/* ---------------------------------------------------------
   21. Boot
--------------------------------------------------------- */
let _booted = false;
function boot() {
  if (_booted) return; _booted = true;
  document.getElementById('app')?.classList.remove('gated');   // reveal main UI
  document.getElementById('auth-root')?.classList.add('hidden');
  if (!localStorage.getItem(StorageService.KEY)) StorageService.saveState(state);
  setLang(settings().language || 'ru');
  applyAnimationLevel();
  applyStaticI18n();
  $$('.nav-btn').forEach(b => b.onclick = () => go(b.dataset.screen));
  $('#crisisBtn').onclick = openCrisis;
  reconcileAchievements();
  checkAchievements(true);
  if (!settings().onboarded) startOnboarding();
  render();
}
document.addEventListener('DOMContentLoaded', () => {
  // If the auth-gate module is present it decides when to boot (session check).
  // Safety net: if the gate never becomes active (crashed mid-load) enter local
  // mode so the app can never get locked behind a broken gate.
  if (window.__ascendGate) { setTimeout(() => { if (!_booted && !window.__ascendGateActive) boot(); }, 6000); }
  else boot();
});

/* ---------------------------------------------------------
   22. Bridge for optional cloud modules (js/cloud-sync.js).
   The app stays 100% functional without them. ESM modules can
   only reach the classic-script `state` through this window API.
--------------------------------------------------------- */
window.AscendApp = {
  KEY: StorageService.KEY,
  boot: () => boot(),                            // called by the auth gate once the mode is decided
  getState: () => state,
  // Replace the whole state (used when applying a validated cloud copy). Never called with unvalidated input.
  setState: (s) => { state = s; },
  saveLocalOnly: () => saveLocalOnly(),          // persist locally WITHOUT triggering a cloud push
  onSave: (fn) => { _onSaveHook = fn; },         // cloud registers here; fired after every local save()
  validate: (s) => StorageService.validateData(s),
  migrate: (raw) => StorageService.migrateData(raw),
  exportPayload: () => StorageService.exportData(state),
  reconcile: () => { reconcileAchievements(); checkAchievements(true); },
  render: () => render(),
  currentScreen: () => currentScreen,
  refreshProfile: () => { if (currentScreen === 'profile') render(); },
  hasMeaningfulProgress: () => (state.habits && state.habits.length > 0) || Object.keys(state.journal || {}).length > 0 || (state.crisisWins || []).length > 0 || computeXp() > 0,
  ui: { openModal, closeModal, toast, el, esc, t, getLang },
};
