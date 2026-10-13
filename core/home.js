import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function home() {
  const h = process.env.DESKHAND_HOME || path.join(os.homedir(), '.deskhand');
  fs.mkdirSync(h, { recursive: true });
  return h;
}

export function expand(p) {
  if (!p) return p;
  return p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p;
}

export function loadJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(expand(p), 'utf8')); } catch (e) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Could not read ${p}: ${e.message}`);
  }
}

export function saveJson(p, obj) {
  fs.mkdirSync(path.dirname(expand(p)), { recursive: true });
  fs.writeFileSync(expand(p), JSON.stringify(obj, null, 2) + '\n');
}
