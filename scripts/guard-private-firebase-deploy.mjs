import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const EXPECTED_PROJECT = 'gen-lang-client-0162948406';
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fail(message) {
  console.error(`Private Firebase deployment blocked: ${message}`);
  process.exit(1);
}

const targetProject = String(process.env.GCLOUD_PROJECT || '').trim();
if (targetProject !== EXPECTED_PROJECT) fail(`target must be ${EXPECTED_PROJECT}; received ${targetProject || '(missing)'}.`);

const rc = JSON.parse(fs.readFileSync(path.join(rootDir, '.firebaserc'), 'utf8').replace(/^\uFEFF/, ''));
if (rc?.projects?.default !== EXPECTED_PROJECT) fail('.firebaserc default project does not match private production.');

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'firebase.json'), 'utf8').replace(/^\uFEFF/, ''));
if (firebaseConfig?.database?.rules !== 'database.rules.json') fail('firebase.json must deploy database.rules.json for private production.');

for (const file of ['.firebaserc', 'firebase.json', 'database.rules.json']) {
  const tracked = spawnSync('git', ['ls-files', '--error-unmatch', file], { cwd:rootDir, encoding:'utf8' });
  if (tracked.status !== 0) fail(`${file} must be tracked by Git before production deployment.`);
}

const status = spawnSync('git', ['status', '--porcelain', '--', '.firebaserc', 'firebase.json', 'database.rules.json'], { cwd:rootDir, encoding:'utf8' });
if (status.status !== 0) fail('could not verify Git status.');
if (status.stdout.trim()) fail('Firebase boundary files have uncommitted changes. Commit them before production deployment.');

console.log(`Private Firebase deployment boundary verified for ${EXPECTED_PROJECT}.`);
