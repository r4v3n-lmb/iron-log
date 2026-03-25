# IRON LOG

A modular workout tracking PWA with Firebase backend. Edit the source app in `src/`, then build a clean deployable site into `dist/`.

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
├── dist/                    # Generated deployable site
├── build.js                 # Build/copy script
├── package.json
├── .gitignore
└── README.md
```

## Setup

### Prerequisites
- Node.js installed

### Installation

1. Navigate to the project directory
2. Install dependencies (if needed):
   ```bash
   npm install
   ```

## Development

During development, edit files in the `src/` folder:
- **HTML changes**: Edit `src/index.html`
- **CSS changes**: Edit `src/css/styles.css`  
- **JS changes**: Edit `src/js/app.js`

## Building

To generate the deployable PWA bundle:

```bash
npm run build
```

This creates a fresh `dist/` folder containing:

- `dist/index.html`
- `dist/ironlog.html`
- `dist/css/styles.css`
- `dist/js/app.js`
- `dist/manifest.json`
- `dist/service-worker.js`
- `dist/icons/*`

## Distribution

**For deployment:**
1. Run `npm run build`
2. Publish the generated `dist/` folder

**For development:**
1. Work in `src/`
2. Run `npm run build` before publishing

## Features

- ✓ Workout tracking with Calendar view
- ✓ Exercise logging with PR tracking
- ✓ Health metrics (water, protein, supplements)
- ✓ Dashboard with charts and weekly tracking
- ✓ Multi-user support (Revan, Bronwen + others)
- ✓ CSV export/import
- ✓ Light/Dark theme
- ✓ Responsive mobile design

## Commands

- `npm run build` - Rebuild the deployable `dist/` site
- `npm run dev` - Alias for the build script

## Tech Stack

- **HTML5** - Structure
- **CSS3** - Styling (custom variables, Grid, Flexbox)
- **JavaScript (ES6+)** - Logic with modules
- **Firebase Firestore** - Database & sync
- **Chart.js** - Graphs & visualizations
- **PWA APIs** - Installability, caching, offline shell

## Browser Support

Works on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## License

MIT
