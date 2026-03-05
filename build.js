import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Paths
const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');
const htmlFile = path.join(srcDir, 'index.html');
const cssFile = path.join(srcDir, 'css', 'styles.css');
const jsFile = path.join(srcDir, 'js', 'app.js');
const firebaseFile = path.join(srcDir, 'js', 'firebase.js');
const outputFile = path.join(distDir, 'ironlog.html');

// Ensure dist directory exists
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read files
let html = fs.readFileSync(htmlFile, 'utf8');
let css = fs.readFileSync(cssFile, 'utf8');
let firebaseCode = fs.readFileSync(firebaseFile, 'utf8');
let appCode = fs.readFileSync(jsFile, 'utf8');

// Remove module imports from app.js and firebase code since we'll inline it
firebaseCode = firebaseCode
  .replace(/export\s+{[\s\S]*?};?/, '') // Remove export statements
  .replace(/export\s+const\s+/g, 'const ');

appCode = appCode
  .replace(/import\s+{[\s\S]*?}\s+from\s+["']\.\/firebase\.js["'];?/g, ''); // Remove firebase import

// Transform HTML
html = html
  .replace(/<link rel="stylesheet" href="css\/styles.css">/, `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="js\/app.js"><\/script>/, `<script type="module">\n${firebaseCode}\n${appCode}\n</script>`);

// Write bundled file
fs.writeFileSync(outputFile, html, 'utf8');

console.log(`✓ Bundled to ${outputFile} (${(fs.statSync(outputFile).size / 1024).toFixed(1)} KB)`);
