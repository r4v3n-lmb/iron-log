import fs from "fs";
import path from "path";
const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");

const copyTargets = [
  { from: path.join(srcDir, "index.html"), to: path.join(distDir, "index.html") },
  { from: path.join(srcDir, "index.html"), to: path.join(distDir, "ironlog.html") },
  { from: path.join(srcDir, "manifest.json"), to: path.join(distDir, "manifest.json") },
  { from: path.join(srcDir, "service-worker.js"), to: path.join(distDir, "service-worker.js") },
  { from: path.join(srcDir, "css"), to: path.join(distDir, "css") },
  { from: path.join(srcDir, "js"), to: path.join(distDir, "js") },
  { from: path.join(srcDir, "icons"), to: path.join(distDir, "icons") },
  { from: path.join(rootDir, "iron_log_logo.png"), to: path.join(distDir, "iron_log_logo.png") },
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyPath(from, to) {
  if (!fs.existsSync(from)) {
    throw new Error(`Missing source: ${from}`);
  }
  ensureDir(path.dirname(to));
  fs.cpSync(from, to, { recursive: true, force: true });
}

function build() {
  fs.rmSync(distDir, { recursive: true, force: true });
  ensureDir(distDir);
  copyTargets.forEach(({ from, to }) => copyPath(from, to));
  console.log(`✓ Built deployable PWA bundle to ${distDir}`);
}

build();
