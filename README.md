# IRON LOG

**App version:** `v1.1.43`

A modular workout tracking PWA with Firebase backend. Edit the source app in `src/`, then build clean deployable outputs into `dist/` and `deploy/`.

**Live app:** https://r4v3n-lmb.github.io/iron-log/

---

## Project Structure

```
ironlog/
├── src/
│   ├── index.html           # Main app shell
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # PWA cache/offline logic
│   ├── css/
│   │   └── styles.css       # App styling
│   ├── js/
│   │   └── app.js           # Main application logic
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── dist/                    # Generated deployable site output
├── deploy/                  # Firebase Hosting public directory
├── build.js                 # Build/copy script
├── firebase.json            # Firebase Hosting config
├── .firebaserc.example      # Firebase project mapping template
├── package.json
├── .gitignore
└── README.md
```

---

## Setup

### Prerequisites

- Node.js installed
- Firebase CLI available (installed via `npm install`)

### Installation

1. Navigate to the project directory
2. Install dependencies:
   ```bash
   npm install
   ```

---

## Development

During development, edit files in the `src/` folder:

- **HTML changes**: Edit `src/index.html`
- **CSS changes**: Edit `src/css/styles.css`
- **JS changes**: Edit `src/js/app.js`

---

## UI QA Checklist

Use this quick checklist before publishing UI changes:

- Run `npm run build` and verify no build errors.
- Check all main modules on mobile and desktop:
  - Dashboard
  - Workouts
  - Progress
  - Profile
  - Rank
  - Settings
- Confirm typography consistency:
  - headline sizing and spacing
  - label/caption letter-spacing
  - button text scale
- Confirm interactive consistency:
  - hover/active states
  - focus-visible outlines for keyboard navigation
  - modal open/close behavior
- Validate spacing/radius consistency on cards, buttons, and form fields.
- Spot-check admin and management tools for overflow/table/layout issues.

---

## Building

To generate the deployable PWA bundle:

```bash
npm run build
```

This creates fresh `dist/` and `deploy/` folders containing:

- `dist/index.html`
- `dist/ironlog.html`
- `dist/css/styles.css`
- `dist/js/app.js`
- `dist/manifest.json`
- `dist/service-worker.js`
- `dist/icons/*`
- `deploy/index.html`
- `deploy/ironlog.html`
- `deploy/css/styles.css`
- `deploy/js/app.js`
- `deploy/manifest.json`
- `deploy/service-worker.js`
- `deploy/icons/*`

The build also syncs root runtime files (`index.html`, `ironlog.html`, `js/`, `css/`, `manifest.json`, `service-worker.js`, `icons/`) from `src/` to keep source/build versions aligned.

## Firebase Hosting

1. Create `.firebaserc` in the project root using `.firebaserc.example` and set your Firebase project ID.
2. Authenticate once:
   ```bash
   npx firebase login
   ```
3. Select the active project:
   ```bash
   npx firebase use <your-firebase-project-id>
   ```
4. Build and deploy Hosting:
   ```bash
   npm run firebase:deploy
   ```
5. Optional local Hosting emulator:
   ```bash
   npm run firebase:serve
   ```

**For development:**
1. Work in `src/`
2. Run `npm run build` before publishing

---

## Features

### 🏋️ Workout Tracking
- Workout builder with named day slots, scheduled weekdays, colour coding, and subtitles/muscle groups
- Active workout session with set logging (weight + reps), exercise navigation, and quick-finish flow
- Session completion modal: RPE rating (1–10), pain flag (None / Mild / Moderate / Severe), pain area, and finish note
- Rest day support with recovery/mobility/walk tracking
- Edit and save workout routines; swap exercises mid-session

### 📊 Dashboard
- Monthly workout count, total kg moved, and streak tracker
- Volume-over-time chart, weekly frequency breakdown, and session type breakdown
- Bodyweight trend and sleep trend graphs
- Recent activity feed

### 📈 Progress & PRs
- Personal Records log with automatic PR detection
- 1RM Estimator
- Visual progress tracker
- Current streak display

### 🗓️ Calendar View
- Calendar navigation (previous/next month)
- Workout history plotted by date

### 🧍 Profile & Health Metrics
- Multi-user account support (sign in / sign up with profile selection)
- Customisable theme colour per account
- Daily inputs: bodyweight, sleep, water, protein, supplements

### ⚙️ Settings & Management
- Light / Dark theme toggle
- Push updates to Firebase, clear local cache
- Duplicate PR cleaner
- CSV export and import
- Gym navigation URL (save and clear)
- App install prompt (PWA installable on supported browsers/devices)
- Version management: check for updates, publish a version, update this device

### ☁️ Sync & Offline
- Firebase Firestore backend with real-time sync
- Offline mode: cached app shell loads when the connection drops; sync resumes on reconnect
- Admin data tables panel for power users

---

## Commands

| Command | Description |
|---|---|
| `npm run build` | Rebuild `dist/` and `deploy/` outputs |
| `npm run build:hosting` | Build Hosting-ready output (`deploy/`) |
| `npm run dev` | Alias for the build script |
| `npm run firebase:serve` | Run Firebase Hosting emulator |
| `npm run firebase:deploy` | Build and deploy Firebase Hosting |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 |
| Styling | CSS3 (custom properties, Grid, Flexbox) |
| Logic | JavaScript ES6+ with modules |
| Database & sync | Firebase Firestore |
| Charts | Chart.js |
| PWA | Service Worker, Web App Manifest (installable, offline shell, caching) |

---

## Authentication

Iron Log uses a username/password sign-up flow backed by Firebase. Each user gets their own profile, metrics, and theme colour. A profile-selector screen is shown on sign-in.

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome / Edge (latest) | ✓ |
| Firefox (latest) | ✓ |
| Safari (latest) | ✓ |
| iOS Safari | ✓ |
| Chrome for Android | ✓ |

PWA installation (Add to Home Screen) is supported on Chrome for Android and Edge. iOS installation is available via Safari's Share → Add to Home Screen.

---

## License

MIT
