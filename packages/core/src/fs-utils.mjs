import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function abs(p) {
  return path.resolve(process.cwd(), p);
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readText(p, fallback = null) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : fallback;
}

export function writeText(p, s) {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, s, 'utf8');
}

export function writeJson(p, obj) {
  writeText(p, JSON.stringify(obj, null, 2) + '\n');
}

export function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function sha(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

export function shaFile(p) {
  return sha(fs.readFileSync(p));
}

export function exists(p) {
  return fs.existsSync(p);
}
