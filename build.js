import fs from "fs";
import path from "path";
const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");

const outputTargets = [
  { from: path.join(srcDir, "index.html"), to: "index.html" },
  { from: path.join(srcDir, "index.html"), to: "ironlog.html" },
  { from: path.join(srcDir, "manifest.json"), to: "manifest.json" },
  { from: path.join(srcDir, "service-worker.js"), to: "service-worker.js" },
  { from: path.join(srcDir, "css"), to: "css" },
  { from: path.join(srcDir, "js"), to: "js" },
  { from: path.join(srcDir, "icons"), to: "icons" },
  { from: path.join(rootDir, "iron_log_logo.png"), to: "iron_log_logo.png" },
];
const rootRuntimeTargets = [
  { from: path.join(srcDir, "index.html"), to: path.join(rootDir, "index.html") },
  { from: path.join(srcDir, "index.html"), to: path.join(rootDir, "ironlog.html") },
  { from: path.join(srcDir, "manifest.json"), to: path.join(rootDir, "manifest.json") },
  { from: path.join(srcDir, "service-worker.js"), to: path.join(rootDir, "service-worker.js") },
  { from: path.join(srcDir, "css"), to: path.join(rootDir, "css") },
  { from: path.join(srcDir, "js"), to: path.join(rootDir, "js") },
  { from: path.join(srcDir, "icons"), to: path.join(rootDir, "icons") },
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
  const outputDirs = ["dist", "deploy"];
  outputDirs.forEach((dirName) => {
    const outputDir = path.join(rootDir, dirName);
    fs.rmSync(outputDir, { recursive: true, force: true });
    ensureDir(outputDir);
    outputTargets.forEach(({ from, to }) => copyPath(from, path.join(outputDir, to)));
  });
  rootRuntimeTargets.forEach(({ from, to }) => copyPath(from, to));
  console.log("✓ Built deployable PWA bundle to dist and deploy");
  console.log("✓ Synced runtime root files from src");
}

build();
