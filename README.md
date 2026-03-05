# IRON LOG

A modular workout tracking app with Firebase backend. Develop with separated files, build into a single HTML file for distribution.

## Project Structure

```
ironlog/
├── src/
│   ├── index.html           # Main HTML structure
│   ├── css/
│   │   └── styles.css       # All styling
│   └── js/
│       ├── app.js           # Main application logic
│       └── firebase.js      # Firebase configuration
├── dist/
│   └── ironlog.html         # Generated bundled file (for distribution)
├── build.js                 # Build script
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
- **JS changes**: Edit `src/js/app.js` or `src/js/firebase.js`

## Building

To bundle all files into a single HTML file for distribution:

```bash
npm run build
```

This creates `dist/ironlog.html` — a single, standalone HTML file with everything inlined. You can send this file to anyone and it will work immediately without any dependencies.

## Distribution

**For end users:**
1. Simply share `dist/ironlog.html`
2. Users open it in any browser
3. Works on desktop, tablet, mobile

**For developers:**
1. Share the entire `src/` folder with `package.json`
2. They can run `npm install && npm run build`
3. Or edit files directly in `src/` for development

## Features

- ✓ Workout tracking with Calendar view
- ✓ Exercise logging with PR tracking
- ✓ Health metrics (water, protein, supplements)
- ✓ Dashboard with charts and heatmap
- ✓ Multi-user support (Revan, Bronwen + others)
- ✓ CSV export/import
- ✓ Light/Dark theme
- ✓ Responsive mobile design

## Security Note

⚠️ **Current Setup:** Firebase config is visible in the HTML source code. For production with sensitive data:
1. Move to backend server (Node.js/Express)
2. Backend handles all Firebase operations
3. Frontend makes API requests only
4. API keys never exposed to clients

Example:
```javascript
// Current (exposed) ❌
const firebaseConfig = { apiKey: "...", ... };

// Future (secure) ✓
fetch('/api/workouts').then(r => r.json())
```

## Commands

- `npm run build` - Build single HTML file to `dist/ironlog.html`
- `npm run dev` - (Future: Watch mode for automatic rebuilds)

## Tech Stack

- **HTML5** - Structure
- **CSS3** - Styling (custom variables, Grid, Flexbox)
- **JavaScript (ES6+)** - Logic with modules
- **Firebase Firestore** - Database & sync
- **Chart.js** - Graphs & visualizations

## Browser Support

Works on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## License

MIT
