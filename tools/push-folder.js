#!/usr/bin/env node
// Pusht einen lokalen Ordner nach kabl-source/<name> auf den Kabl-Branch.
// Usage: node push-folder.js <ordner> [zielname]
// Voraussetzung: git installiert und bei GitHub angemeldet, Node >= 16.7

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO = 'https://github.com/spittfire/shopify-webhook-handler.git';
const BRANCH = 'claude/kabl-webshop-vt2o6c';
const BASE = 'kabl-source';
const IGNORE = /(^|[\\/])(\.DS_Store|Thumbs\.db|desktop\.ini|\._.*)$/;
const MAX_BYTES = 95 * 1024 * 1024;

const arg = process.argv[2];
if (!arg) {
  console.error('Usage: node push-folder.js <ordner> [zielname]');
  process.exit(1);
}

const src = path.resolve(arg.replace(/^~(?=$|[\\/])/, os.homedir()).replace(/^["']|["']$/g, '').trim());
if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
  console.error(`Kein Ordner: ${src}`);
  process.exit(1);
}

const target = (process.argv[3] || path.basename(src)).replace(/[^\w.-]+/g, '-');
const destRel = `${BASE}/${target}`;

const tooBig = [];
(function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (IGNORE.test(p)) continue;
    if (entry.isDirectory()) scan(p);
    else if (fs.statSync(p).size > MAX_BYTES) tooBig.push(p);
  }
})(src);
if (tooBig.length) {
  console.error('Dateien über 95 MB (GitHub-Limit 100 MB), bitte verkleinern:\n' + tooBig.join('\n'));
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kabl-push-'));
const git = (args, opts = {}) => execFileSync('git', args, { cwd: tmp, stdio: 'inherit', ...opts });
const gitOut = (args) => execFileSync('git', args, { cwd: tmp }).toString().trim();

try {
  execFileSync('git', ['clone', '--depth', '1', '--filter=blob:none', '--sparse', '--branch', BRANCH, REPO, tmp], { stdio: 'inherit' });
  git(['sparse-checkout', 'set', BASE]);

  const dest = path.join(tmp, BASE, target);
  fs.cpSync(src, dest, { recursive: true, filter: (p) => !IGNORE.test(p) });

  git(['add', '-A', destRel]);
  if (!gitOut(['status', '--porcelain'])) {
    console.log('Keine Änderungen, nichts zu pushen.');
    process.exit(0);
  }

  git(['commit', '-m', `Add ${destRel}`]);
  try {
    git(['push', 'origin', `HEAD:${BRANCH}`]);
  } catch {
    git(['pull', '--rebase', '--depth', '50', 'origin', BRANCH]);
    git(['push', 'origin', `HEAD:${BRANCH}`]);
  }
  console.log(`\nFertig: ${destRel} liegt auf ${BRANCH}.`);
} catch (err) {
  console.error(`\nFehlgeschlagen: ${err.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
