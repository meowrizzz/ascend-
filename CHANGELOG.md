# Changelog

## 0.1.0 — Personal MVP (2026-07-26)

First stabilized build intended for daily personal use (local-first, no account).

### Core functionality
- **Onboarding** — 6-step flow (welcome → goals → habit catalog → personalization → privacy → summary), fully skippable; no artificial XP granted.
- **Habits** — create from catalog or custom; edit, archive/restore, delete; private habits with a neutral dashboard alias; four tracking modes: `done`, `count`, `duration`, `abstinence` (+ count/duration used as "limit"). One-tap logging from both the Dashboard and the Habits tab (shared logic).
- **RPG progression** — derived XP, non-linear levels + titles, character stats (Discipline / Strength / Knowledge / hidden Resilience) with difficulty-weighted, anti-farm, saturating growth; hidden stat ranks (Novice → Elite); per-stat detail with description, "what develops it", linked habits and a reconstructed growth sparkline.
- **Achievements** — 86 config-driven achievements across categories; unlock overlays shown one-at-a-time via a queue (XP toast → stat feedback → single achievement).
- **Daily missions** — reflect today's real actions (no separate XP source).
- **Journal** — daily entry (mood/energy/sleep, optional "urge" only for limit-context users, free-text, triggers) with searchable history and per-entry detail; one entry per date (updates, never duplicates).
- **Crisis mode** — breathing timer + reason + quick actions; shown only to users with a limit-category habit (or who have used it before).
- **Statistics** — 14-day mood/energy chart, streak bars, trigger analysis, cautious weekly report; friendly starter state before first activity.
- **Data management** — export/import JSON backup, reset progress (keeps habits + settings), full delete (Ascend keys only).
- **i18n** — Russian + English, switchable at runtime.
- **Freemium config** — plan/limit configuration (free = 8 active habits); no payments wired.

### Fixed in this stabilization pass
- Modal keydown-trap listener could leak if a modal opened over another — now removed before re-binding.
- Journal `sleepH` could store negative / out-of-range values — clamped to `[0, 24]`.
- Dashboard quick-add could grow unbounded — clamped to `[0, 1e6]`, guaranteed finite.
- Added `runSelfCheck()` dev diagnostic (see below).

### Data integrity (verified)
- Every mutation persists immediately; nothing lost on reload.
- XP and character stats are **derived**, never stored counters → no double-counting on reload; delete/reset/import always recompute.
- Achievements never re-unlock; journal never duplicates per date; deleting a habit removes its logs (logs live inside the habit — no orphans possible).
- Import validates `app`/`schemaVersion`/structure and is atomic; corrupt or foreign files are rejected without touching current data.
- Legacy demo data migrates to a clean state; real legacy (v1) data is preserved and upgraded to schema v3.
- Full delete removes only `ascend_app_state` / `ascend.v1` (never `localStorage.clear()`).

### Known limitations
- **Local-only.** Data lives in one browser via LocalStorage. No accounts, cloud sync, or cross-device — make backups (Profile → Управление данными → Скачать резервную копию).
- No real payments / AI / server. Plans and analytics are config/stubs only.
- Notifications are neutral stubs (not scheduled).
- Language switch does not retranslate an already-open modal until it is reopened (no crash).
- Legal pages (privacy/terms) are not written — needs legal review before any public launch.

### Storage
- Namespace: `ascend_app_state` (single JSON), `schemaVersion: 3`, via `StorageService`.
- Backup file format: `{ app: "Ascend", schemaVersion, exportedAt, data }`, filename `ascend-backup-YYYY-MM-DD.json`.
- Diagnostics: run `runSelfCheck()` in the browser console — validates structure, unique IDs, valid dates, no negatives/NaN/Infinity, schema match. It never returns journal text, private names, or notes.

### Run
Open `index.html` directly in a browser (no server required). For a local static server:
```bash
npx --yes http-server . -p 8777 -c-1
```
then open `http://localhost:8777`.
