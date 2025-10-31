import { cfg } from './config.js';
import { log } from './utils/logger.js';
import { readLines, listImages, pickRandom } from './utils/files.js';
import { initCache, isProcessed, markProcessed } from './storage/cache.js';
import { launchBrowser, newPageWithCookies } from './services/browser.js';
import { getLatestTweetFromProfile, replyToTweet } from './services/twitter.js';
let running = false;
async function runOnce() {
  if (running) { return; }
  running = true;
  try {
    await initCache(cfg.processedPath);
    const profiles = (await readLines(cfg.profilesFile)).slice(0, cfg.maxProfilesPerRun);
    const comments = await readLines(cfg.commentsFile);
    const images = await listImages(cfg.imagesDir);
    if (!profiles.length || !comments.length) { running = false; return; }
    const browser = await launchBrowser();
    const page = await newPageWithCookies(browser);
    let didReply = false;
    for (const profileUrl of profiles) {
      try {
        const latest = await getLatestTweetFromProfile(page, profileUrl);
        if (!latest) continue;
        if (isProcessed(latest.tweetId)) continue;
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2500));
        const comment = pickRandom(comments);
        const maybeImage = images.length ? pickRandom(images) : null;
        const ok = await replyToTweet(page, latest.url, comment, maybeImage);
        if (ok) { await markProcessed(latest.tweetId); didReply = true; }
        if (cfg.oneReplyPerRun && didReply) break;
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 4000));
      } catch (err) {}
    }
    await browser.close();
  } catch (err) {} finally { running = false; }
}
(async () => { await runOnce(); setInterval(runOnce, cfg.runIntervalMs); })();
