import fs from 'fs-extra';
import { ensureJson } from '../utils/files.js';
let cache = null;
let pathRef = null;
export async function initCache(processedPath) {
  pathRef = processedPath;
  cache = await ensureJson(processedPath, { tweets: {} });
}
export function isProcessed(tweetId) {
  if (!cache) return false;
  return Boolean(cache.tweets[tweetId]);
}
export async function markProcessed(tweetId) {
  if (!cache) cache = { tweets: {} };
  cache.tweets[tweetId] = Date.now();
  await fs.outputJson(pathRef, cache, { spaces: 2 });
}
