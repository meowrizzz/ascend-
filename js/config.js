/* =========================================================
   Ascend — product configuration
   Central place for plans, limits, feature flags, onboarding.
   Kept separate from business logic so it can be swapped or
   driven from a server later (Stage 3/4) without touching UI.
   ========================================================= */
'use strict';

/* ---------------------------------------------------------
   Feature flags — gate not-yet-ready capabilities safely.
   Everything server-dependent is OFF in this frontend stage.
--------------------------------------------------------- */
const FEATURE_FLAGS = {
  cloudSync: false,       // Stage 3 — requires backend
  aiInsights: false,      // Stage 4 — requires server proxy for API keys
  payments: false,        // Stage 4 — requires secure server + provider adapter
  pushNotifications: false,
  weeklyReports: true,    // local, data-driven
  dailyMissions: true,    // local
  analytics: false,       // opt-in only; no network sink wired
};

/* ---------------------------------------------------------
   Subscription plans + limits (config-driven, no hardcoding
   of limits across the codebase). Prices are placeholders and
   NOT wired to any payment provider.
--------------------------------------------------------- */
const PLANS = {
  free: {
    id: 'free',
    nameKey: 'plan.free.name',
    price: { monthly: 0, yearly: 0 },
    limits: {
      activeHabits: 8,
      historyDays: 90,
      themes: ['dark'],
      customMissions: false,
      advancedAnalytics: false,
      aiInsights: false,
      cloudSync: false,
      autoBackup: false,
      extraAchievements: false,
    },
    featureKeys: ['plan.f.habits8', 'plan.f.streaks', 'plan.f.journal', 'plan.f.basicStats', 'plan.f.achievements', 'plan.f.levels', 'plan.f.guest', 'plan.f.export', 'plan.f.crisis', 'plan.f.weeklyBasic'],
  },
  premium_monthly: {
    id: 'premium_monthly',
    nameKey: 'plan.premium.name',
    price: { monthly: 4.99, yearly: null },
    limits: unlimitedLimits(),
    featureKeys: premiumFeatureKeys(),
  },
  premium_yearly: {
    id: 'premium_yearly',
    nameKey: 'plan.premium.name',
    price: { monthly: null, yearly: 39.99 },
    limits: unlimitedLimits(),
    featureKeys: premiumFeatureKeys(),
  },
  // Future optional one-time purchase — surfaced as "coming soon".
  lifetime: {
    id: 'lifetime',
    nameKey: 'plan.lifetime.name',
    price: { once: 129 },
    comingSoon: true,
    limits: unlimitedLimits(),
    featureKeys: premiumFeatureKeys(),
  },
};

function unlimitedLimits() {
  return {
    activeHabits: Infinity,
    historyDays: Infinity,
    themes: ['dark', 'midnight', 'aurora'],
    customMissions: true,
    advancedAnalytics: true,
    aiInsights: true,
    cloudSync: true,
    autoBackup: true,
    extraAchievements: true,
  };
}
function premiumFeatureKeys() {
  return ['plan.p.unlimited', 'plan.p.analytics', 'plan.p.sync', 'plan.p.history', 'plan.p.themes', 'plan.p.reports', 'plan.p.missions', 'plan.p.achievements', 'plan.p.ai', 'plan.p.backup'];
}

// Never gate these behind a paywall (safety / ownership of data).
const NEVER_PAYWALLED = ['dataExport', 'dataDelete', 'crisisMode', 'basicPrivacy', 'ownRecords'];

function planFor(id) { return PLANS[id] || PLANS.free; }
function planLimit(planId, key) {
  const p = planFor(planId);
  return p.limits[key];
}

/* ---------------------------------------------------------
   Onboarding goals (Screen 2). Neutral, multi-select.
   Labels resolved via i18n keys — no assumptions about the user.
--------------------------------------------------------- */
const ONBOARDING_GOALS = [
  { id: 'discipline', emoji: '🧠', key: 'goal.discipline' },
  { id: 'sport',      emoji: '🏃', key: 'goal.sport' },
  { id: 'study',      emoji: '📚', key: 'goal.study' },
  { id: 'sleep',      emoji: '😴', key: 'goal.sleep' },
  { id: 'digital',    emoji: '📱', key: 'goal.digital' },
  { id: 'limit',      emoji: '🛡', key: 'goal.limit' },
  { id: 'mood',       emoji: '📓', key: 'goal.mood' },
  { id: 'custom',     emoji: '✨', key: 'goal.custom' },
];

/* Character-stat registry — the single source for a stat's identity.
   Extensible: add Стойкость / Творчество / Социальность / Энергия / Финансы
   by appending an entry here (+ i18n keys) and, if it needs its own growth
   source, adding it to STAT_MODEL.stats and routing a habit's `stat` to it.
   Each entry: id · emoji · name (key) · description (descKey) · what grows it
   (growsKey) · palette color · whether it shows on the dashboard. */
const CHARACTER_STATS = [
  { id: 'discipline', emoji: '🧠', key: 'stat.discipline', descKey: 'statd.discipline', growsKey: 'statg.discipline', color: 'discipline', dashboard: true },
  { id: 'strength',   emoji: '💪', key: 'stat.strength',   descKey: 'statd.strength',   growsKey: 'statg.strength',   color: 'strength',   dashboard: true },
  { id: 'knowledge',  emoji: '📚', key: 'stat.knowledge',  descKey: 'statd.knowledge',  growsKey: 'statg.knowledge',  color: 'knowledge',  dashboard: true },
  { id: 'resilience', emoji: '🌿', key: 'stat.resilience', descKey: 'statd.resilience', growsKey: 'statg.resilience', color: 'discipline', dashboard: false },
];

/* Hidden rank ladder mapped onto a stat's percent. Universal, non-toxic,
   translation-friendly names — perception beats a raw number. */
const STAT_RANKS = [
  { min: 0,  key: 'rank.novice' },
  { min: 10, key: 'rank.start' },
  { min: 25, key: 'rank.apprentice' },
  { min: 50, key: 'rank.advanced' },
  { min: 75, key: 'rank.master' },
  { min: 90, key: 'rank.elite' },
];

/* Premium themes. Each theme only overrides existing CSS variables (in
   css/styles.css via :root[data-theme="…"]) — no component CSS is duplicated.
   The `bg` / `colors` here drive the preview card + <meta theme-color>. */
const THEMES = [
  { id: 'original', nameKey: 'theme.original', bg: '#0B0F14', colors: ['#3DDC97', '#4C8DFF', '#A66BFF'] },
  { id: 'ember',    nameKey: 'theme.ember',    bg: '#16100C', colors: ['#FF8A3D', '#FF5E5E', '#FFB020'] },
  { id: 'ocean',    nameKey: 'theme.ocean',    bg: '#071019', colors: ['#2DD4BF', '#38BDF8', '#6366F1'] },
  { id: 'cyber',    nameKey: 'theme.cyber',    bg: '#0A0812', colors: ['#00E5FF', '#7C4DFF', '#FF2ED1'] },
  { id: 'gold',     nameKey: 'theme.gold',     bg: '#0A0A0A', colors: ['#E8C36B', '#C9A24A', '#F5D889'] },
];
const THEME_IDS = THEMES.map(t => t.id);

if (typeof window !== 'undefined') {
  window.AscendConfig = { FEATURE_FLAGS, PLANS, NEVER_PAYWALLED, ONBOARDING_GOALS, CHARACTER_STATS, STAT_RANKS, THEMES, THEME_IDS, planFor, planLimit };
}
