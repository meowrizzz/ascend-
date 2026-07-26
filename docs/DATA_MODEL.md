# Ascend — normalized data model (Stage 2/3 preparation)

> Status: **design only.** The running app is a local-first guest client
> (LocalStorage, single JSON per browser). This document defines the
> normalized relational model the cloud version will migrate to. Nothing
> here is wired to a database yet.

## Principles
- One row per record — **do not** store a user's whole system as one giant JSON blob in the DB.
- Every table: `id` (uuid), `owner_id` (uuid → users.id), `created_at`, `updated_at`.
- Row ownership is enforced **on the server** (RLS / policy), never by hiding a client button.
- LocalStorage remains valid for: guest mode, cache, offline queue, transient settings.
- Derived values (XP, streaks, levels, achievements) are **computed**, not stored as independent counters, to stay consistent after delete/reset/import/sync.

## Entities
| Table | Purpose | Key fields |
|---|---|---|
| `users` | account identity | id, email (unique), created_at |
| `profiles` | display data | user_id, display_name, avatar, created_at |
| `user_settings` | preferences | user_id, language, timezone, theme, animations, first_day, time_format, missions, notifications, privacy_screen |
| `habits` | habit definitions | id, owner_id, name, description, icon, color, category, type, mode, unit, goal, start_date, is_private, alias, is_archived, order, pinned |
| `habit_schedules` | recurrence | id, habit_id, owner_id, type(daily/weekly/custom), days_of_week, times |
| `habit_logs` | per-day entries | id, habit_id, owner_id, date, value, source |
| `journal_entries` | daily journal | id, owner_id, date, good, hard, helped, notes (sensitive) |
| `mood_entries` | mood/energy/sleep | id, owner_id, date, mood, energy, sleep_h, sleep_q, urge |
| `triggers` | trigger tags per entry | id, owner_id, entry_id, trigger_key |
| `crisis_sessions` | crisis usage | id, owner_id, started_at, outcome (sensitive) |
| `xp_events` | audit of XP sources | id, owner_id, source_type, source_ref, amount, date |
| `levels` | level config (global) | level, xp_required, title_key |
| `achievements` | catalog (global) | id, category, icon, name_key, target, metric_key, hidden |
| `user_achievements` | unlocks | id, owner_id, achievement_id, unlocked_at |
| `daily_missions` | generated missions | id, owner_id, date, habit_id, difficulty, xp, done |
| `weekly_challenges` | weekly goals | id, owner_id, week, spec, progress |
| `weekly_reports` | cached reports | id, owner_id, week, payload |
| `personal_rewards` | user-defined rewards | id, owner_id, name, unlock_rule |
| `subscriptions` | billing state | id, owner_id, plan, status, current_period_end, provider_ref |
| `devices` | active sessions | id, owner_id, user_agent, last_seen |
| `notification_preferences` | channels/quiet hours | id, owner_id, channel, enabled, quiet_from, quiet_to |
| `data_exports` | export requests | id, owner_id, requested_at, status |

## Sensitive fields (never in analytics / logs / URLs / event names)
`journal_entries.*`, `mood_entries.notes`, `crisis_sessions.outcome`, private habit `name`/`alias`, `triggers.trigger_key` when tied to a private habit.

## Migration path (guest → cloud)
1. Client keeps `schemaVersion`; server exposes the same migration contract.
2. On sign-in, offer to import the local JSON; show a list of what transfers.
3. Upsert by stable client `id` to avoid duplicates.
4. Keep local data until the server confirms a successful sync.
5. On conflict, present a clear choice (keep local / keep cloud / merge).
