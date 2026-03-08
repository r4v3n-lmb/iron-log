# IRON LOG Feature Roadmap (2026)

## Goal
Turn IRON LOG from a flexible workout tracker into a fast, intelligent gym companion with:
- frictionless daily flow
- progression coaching
- deep lift history
- recovery-aware recommendations
- stronger onboarding
- mobile-first execution

## Product Priorities
1. Speed at workout time (open app -> start workout in seconds).
2. Better training decisions (what to do next, when to push/deload).
3. Personal continuity (history, trends, notes, goals).
4. Mobile reliability (offline, large controls, sticky actions).

## Phase 1 (P0): Fast "Today" Flow
### Scope
- One-tap "Start Scheduled Workout" from home/header.
- Prefill last-used weights/reps for each exercise.
- Warmup + working set suggestions.
- Quick finish modal:
  - session RPE
  - short session note
  - pain flags (none / mild / moderate / severe + body area)

### Acceptance Criteria
- Time from open to first logged set under 10 seconds.
- At least 80% of exercises are prefilled when prior data exists.
- Finish workflow requires <= 3 taps from last exercise.

## Phase 2 (P1): Progression Intelligence
### Scope
- Suggested next load/reps per exercise from recent performance.
- Plateau detection (no meaningful progress across N sessions).
- "Overdue to progress" reminders.
- Deload suggestion after fatigue indicators:
  - high soreness
  - sleep drop
  - missed sessions
  - repeated stalled sets

### Acceptance Criteria
- Suggestions generated for each tracked lift with >= 2 recent data points.
- Plateau and deload flags visible in day panel and notifications.

## Phase 3 (P1): Exercise History Drill-Down
### Scope
Exercise detail view should include:
- last 10 sessions
- best set ever
- estimated 1RM trend
- volume trend
- session notes tied to that lift
- bodyweight correlation snapshot

### Acceptance Criteria
- Any exercise click opens a detail panel in <= 250ms locally.
- Trends work on both single-user and shared-session data formats.

## Phase 4 (P2): Recovery Readiness
### Scope
- Readiness score from:
  - sleep
  - soreness
  - bodyweight change
  - missed sessions
  - fatigue notes
- Recommendation states:
  - push
  - normal
  - light
  - rest

### Acceptance Criteria
- Score updates daily and before "Start Today".
- Recommendation rationale is visible (not a black box).

## Phase 5 (P2): Onboarding Upgrade
### Scope
- Goal selection: hypertrophy / strength / general fitness.
- Training-day selection.
- Starter split generation.
- Core exercise prefill.
- 60-second guided walkthrough.

### Acceptance Criteria
- New user reaches first loggable workout in <= 2 minutes.

## Phase 6 (P3): Mobile Gym UX
### Scope
- Larger tap targets in session view.
- Sticky workout controls.
- Rest timer + in-session stopwatch.
- Superset mode.
- Swipe between exercises.
- Offline-first logging with sync on reconnect.

### Acceptance Criteria
- No data loss during temporary offline usage.
- One-handed interaction improved for common actions.

## Phase 7 (P3): Goals Layer
### Scope
- Monthly goal targets.
- Weekly set targets by muscle group.
- Target bodyweight range.
- Streaks + milestones.
- "On pace / behind pace" indicators.

### Acceptance Criteria
- Goal progress appears in dashboard and daily workflow.

## Additional Candidate Features
- Notes/media per exercise (form checks).
- Auto-generated weekly/monthly recap.
- Split builder with drag/drop and muscle-balance feedback.
- Coach/shared review mode.
- Muscle recovery heatmap from recent volume.

## Data Model Additions (High Level)
- `state.workouts[date][dayKey].sessionMeta`:
  - `rpe`, `painFlags`, `fatigueNote`, `restTimerEvents`
- `state.exerciseMeta[exerciseKey].historyInsights` cache
- `state.goals`:
  - monthly, weekly muscle targets, bodyweight range, streak rules
- `state.readiness[date]`:
  - score + factors + recommendation

## Suggested Delivery Order
1. P0 Fast Today flow
2. P1 Progression + Exercise History
3. P2 Recovery + Onboarding
4. P3 Mobile depth + Goals

## Engineering Notes
- Keep features additive and backward-compatible with existing data.
- Reuse current day panel and notifications surfaces before adding new screens.
- Ship in small slices behind feature flags where possible.

## Sprint Backlog (Execution Checklist)
### Sprint A: P0 Daily Flow (In Progress)
- [x] One-tap "Start Today" launches scheduled day and starts timer.
- [x] Auto-prefill last-used working weights into today's session.
- [x] Warmup suggestion shown from selected/last working weight.
- [x] Quick finish capture modal (RPE, pain level/area, finish note).
- [x] Persist quick finish metadata in session (`sessionMeta`).
- [ ] Add "resume in-progress session" banner on app open.
- [ ] Add "quick start from lock screen/PWA shortcut" entry point.

### Sprint B: Progression Intelligence
- [ ] Add next-load recommendation panel per exercise.
- [ ] Add plateau detection rule (no load or rep progress for 3+ sessions).
- [ ] Add overdue progression notifications.
- [ ] Add deload suggestion when fatigue/readiness thresholds fail.

### Sprint C: History Drill-Down
- [ ] Extend exercise history modal with best set and last 10 table.
- [ ] Add 1RM trend line in modal.
- [ ] Add volume trend line in modal.
- [ ] Add exercise-note timeline and bodyweight correlation.

### Sprint D: Recovery + Onboarding
- [ ] Compute readiness score daily from sleep/soreness/bodyweight/adherence.
- [ ] Show recommendation state (push/normal/light/rest).
- [ ] Add onboarding wizard (goal -> days -> generated split -> walkthrough).

### Sprint E: Mobile & Goals
- [ ] Sticky session controls and larger tap targets.
- [ ] Rest timer presets + superset mode.
- [ ] Offline queue for unsynced logs.
- [ ] Goals layer (monthly, weekly muscle targets, streak pacing).
