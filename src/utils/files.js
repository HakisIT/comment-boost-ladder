import fs from 'fs-extra';
import path from 'path';
export async function readLines(filePath) {
  const exists = await fs.pathExists(filePath);
  if (!exists) return [];
  const raw = await fs.readFile(filePath, 'utf8');
  return raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}
export async function ensureJson(filePath, fallback) {
  const exists = await fs.pathExists(filePath);
  if (!exists) {
    await fs.outputJson(filePath, fallback, { spaces: 2 });
    return fallback;
  }
  return fs.readJson(filePath);
}
export async function listImages(dir) {
  const exists = await fs.pathExists(dir);
  if (!exists) return [];
  const files = await fs.readdir(dir);
  return files
    .filter(f => /\.(jpe?g|png|gif|webp)$/i.test(f))
    .map(f => path.join(dir, f));
}
export function pickRandom(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}
