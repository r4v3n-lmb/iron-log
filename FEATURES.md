# IRON LOG Features & Enhancements Roadmap

## Current Status
- ✅ Modular project structure implemented
- ✅ Build pipeline working (npm run build)
- ✅ Single-file distribution ready
- ✅ Firebase integration isolated

## Planned Features & Enhancements

### High Priority
- [x] **Quick-log mode** — right now opening a workout requires tapping the card, scrolling to the exercise, entering weight, entering reps, checking the box. A swipe-up "quick log" sheet on mobile that just shows: exercise name, big number pads for weight and reps, check. No scrolling.
- [x] **Auto-fill last session's weights** — when you open a workout, pre-populate every weight field with whatever you lifted last time. One tap to confirm or override. Massive time saver mid-workout.
- [x] **Haptic feedback** — when you check off an exercise on mobile, a short vibration (`navigator.vibrate(40)`). Tiny thing, feels satisfying. (In conjunction with haptic feedback, add it on Completing a workout and also shoot some confetti.)

### Medium Priority
- [x] **Exercise history graph** — tap any exercise name and see a mini line chart of your weight over time. Right now you can't easily tell if you've been progressing on cable flys over 3 months without digging through dates manually.
- [x] **1RM calculator** — sits below dashboard. Enter your working weight and reps, it estimates your one-rep max using the Epley formula. Good motivator and useful for programming.
- [x] **BMI tracker** — alongside bodyweight, live BMI calculation with color-coded status
- [x] **Volume per muscle group chart** — instead of just total tonnage, break it down: how many sets did chest get this week vs back vs legs. Helps spot imbalances.
- [x] **Month-over-month comparison** — "This month vs last month" card showing volume, sessions, and top PRs side by side.
- [x] **Workout templates / programs** — save a full week as a "program". Switch programs in one tap instead of editing individual days.
- [x] **Hydration goal scaling** — right now it's a flat target. Should auto-adjust based on session intensity logged that day and whether it's a cardio vs weights day.

### Low Priority
- [x] **Dark/light isn't enough — add an AMOLED black theme** — Added an `amoled` theme option that forces pure black backgrounds and removes grid noise; activates via settings button. Great for OLED phones and dark gyms.
- [x] **Muscle diagram** — Interactive muscle filter modal with 6 muscle group buttons (Chest, Back, Legs, Shoulders, Arms, Core). Tap a muscle to filter exercises and day cards by matching exercises. Exercises without matches are dimmed. Filter persists until explicitly cleared. Header button shows active filter state.
- [x] **Onboarding flow** — first-time users see a welcome modal asking for their name, training days, and whether to start with a Push/Pull/Legs template or a blank plan. Stores name for header greeting and populates workout grid accordingly.

### Completed Features
- [x] **Quick-log mode** — Added a bottom-sheet modal with big number inputs for weight/reps, accessible via ⚡ button next to each exercise. Pre-fills with last session's weights and auto-checks when both values are entered.
- [x] **Auto-fill last session's weights** — Weight input fields now automatically populate with the last weight used for each exercise when opening a workout. Auto-filled weights are highlighted with a subtle orange tint to distinguish them from manually entered values. Works for both single-user and multi-user sessions.
- [x] **Exercise swap suggestions** — Swap modal now shows a curated list of common alternative exercises for the same muscle group. Click any suggestion to populate the input field, or type to filter suggestions. Still allows custom exercise names.
- [x] **Haptic feedback** — Added vibration feedback on mobile devices when checking off exercises (40ms), completing workouts (100-50-100ms pattern), and using quick-log. Includes confetti animation when completing workouts for celebratory feedback. Optimized with CSS for smooth performance.
- [x] **Sleep tracker** — Added sleep logging to the health checklist with +/- buttons for hours slept. Displays sleep trend chart in dashboard showing correlation with workout performance. Simple but eye-opening data.
- [x] **Personal records wall** — Added a dedicated section showing every PR you hold with filtering by muscle group. Shows the date achieved and how long you've held each record. Displays weight, exercise name, muscle group badge, and duration held.
- [x] **Consistency score** — Added a 0-100 consistency score in the stats bar showing percentage of planned workouts completed over the last 4 weeks. More motivating than streaks since missing one day doesn't reset progress.
- [x] **Swipe gestures on mobile** — Added touch gesture support for exercise rows on mobile devices. Swipe left to mark exercise as done, swipe right to uncheck/skip. Includes visual feedback with smooth animations and color indicators. Only enabled on touch devices to avoid desktop interference.
- [x] **1RM calculator** — Interactive calculator below the dashboard to estimate one-rep max using the Epley formula. Users enter working weight and reps; calculator instantly displays estimated 1RM with formula breakdown. Useful for programming and tracking strength progression. Clean UI with real-time calculation feedback.
- [x] **BMI tracker** — Displays live BMI calculation in the health checklist based on current bodyweight and profile height. Color-coded status (green for normal, yellow for overweight, orange/red for obese). Updates automatically as bodyweight is logged. Added height field to all profiles.
- [x] **Volume per muscle group chart** — Added doughnut chart to dashboard showing volume (sets) breakdown by muscle group (chest, back, shoulders, arms, legs, core). Helps identify muscle imbalances and training focus. Updated in real-time with workout data. Shows training distribution visually.
- [x] **Month-over-month comparison** — New dashboard card comparing current month vs previous month metrics: sessions completed, total tonnage, and new PRs. Shows percentage change with color indicators (green for increase, red for decrease). Motivational feature for tracking long-term progress and identifying trends.
- [x] **Workout templates / programs** — Save and load full workout programs via settings. Users can create templates from current plan, give them names, and quickly load them to reset/switch programs without manual editing. Useful for periodized training (e.g., Push/Pull/Legs variations). Stored in localStorage for persistence.
- [x] **Hydration goal scaling** — Water target now automatically adjusts based on daily workout intensity. Cardio days add +0.5L, high tonnage workouts (+500kg) add 0.25-0.5L bonus, and high exercise count (15+) adds +0.25L. Target intelligently scales between base profile target and 5.0L max to ensure proper hydration on intense training days.

---

*Paste your feature list here, and I'll implement them one by one.*