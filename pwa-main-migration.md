# PWA Main Migration

Branch: `pwa_main`

## Goal

Move Iron Log away from the single-file `ironlog.html` source into a maintainable PWA-ready structure without changing the core product behavior.

## Completed

- Extracted the app into:
  - `src/index.html`
  - `src/css/styles.css`
  - `src/js/app.js`
- Reworked the build output to generate a deployable `dist` app shell.
- Added:
  - `src/manifest.json`
  - `src/service-worker.js`
  - dedicated PWA icons in `src/icons/`
- Added app-shell behavior:
  - service worker registration
  - install prompt handling
  - offline banner
  - app splash/boot shell
  - local snapshot fallback when Firebase is unreachable
  - pending-sync marker for offline saves

## Deployment Shape

The deployable artifact is now `dist/`.

Primary files:

- `dist/index.html`
- `dist/css/styles.css`
- `dist/js/app.js`
- `dist/manifest.json`
- `dist/service-worker.js`

Compatibility:

- `dist/ironlog.html` is also generated from the same HTML shell.

## Offline Expectations

- The app shell should load from cache.
- Firebase-backed live data still requires connectivity.
- When saves fail offline, the current app state is preserved to local storage and flagged for later sync.
- A local snapshot can be restored if Firebase is unavailable during load.

## Remaining Validation

- Test `npm run build`
- Open `dist/index.html` through a local static server
- Verify manifest/installability in Chrome DevTools
- Test Android add-to-home-screen flow
- Test offline shell load after first visit
- Validate Firebase reconnect + pending sync behavior

## Notes

- iPhone PWA support will still be weaker than Android.
- The source-of-truth for the app should now move toward `src/`, not the root `ironlog.html`.
- GitHub Pages currently remains safe on the existing workflow from `main`/`features`.
- A separate manual workflow now exists for `pwa_main` at `.github/workflows/deploy-pwa-pages.yml`.
- That PWA workflow only deploys when manually triggered with the confirmation text `DEPLOY_PWA`, because this repo has a single live GitHub Pages URL.
