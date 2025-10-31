import { log } from '../utils/logger.js';
import { humanScroll, waitVisible, sleep, humanType } from '../utils/human.js';

/**
 * Extracts the newest tweet link from a profile
 * Returns: { tweetId, url } or null
 */
export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, 'Opening profile');
  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 70000 });

  await humanScroll(page);

  const tweet = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    for (const a of articles) {
      const anchors = Array.from(a.querySelectorAll('a')).map(el => el.getAttribute('href') || '');
      const statusLink = anchors.find(h => /\/status\/\d+/.test(h));
      if (!statusLink) continue;
      const match = statusLink.match(/\/status\/(\d+)/);
      if (!match) continue;
      const href = statusLink.startsWith('http') ? statusLink : `https://x.com${statusLink}`;
      return { tweetId: match[1], url: href };
    }
    return null;
  });

  if (!tweet) {
    log.warn({ profileUrl }, '⚠️ No tweet found. UI selectors may need adjustment.');
    return null;
  }

  return tweet;
}

/**
 * Post reply text (+ optional image) to a tweet
 */
export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, 'Opening tweet to reply');
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000 + Math.random() * 2000);

  // ✅ Ensure page is scrolled so reply button becomes visible
  await humanScroll(page);

  // ✅ Retry system for reply button
  const replySelectors = [
    'div[data-testid="replyButtonInline"]',
    'div[data-testid="reply"]',
    'button[aria-label*="Reply"]',
    'div[role="button"][aria-label*="Reply"]'
  ];

  async function clickReply() {
    for (const selector of replySelectors) {
      const el = await page.$(selector);
      if (el) {
        await el.click().catch(() => {});
        return true;
      }
    }

    // ✅ Fallback: XPath click
    const [btn] = await page.$x("//div[contains(@aria-label,'Reply') or contains(@data-testid,'reply')]");
    if (btn) {
      await btn.click().catch(() => {});
      return true;
    }

    return false;
  }

  let success = false;
  for (let i = 0; i < 5; i++) {
    success = await clickReply();
    if (success) break;
    await page.mouse.move(200, 200);
    await page.mouse.wheel({ deltaY: 400 });
    await sleep(1000);
  }

  if (!success) {
    log.warn('⚠️ Could not click reply button — selectors may be updated');
    return false;
  }

  await page.waitForSelector('div[contenteditable="true"]', { timeout: 20000 });
  await sleep(1200 + Math.random() * 1500);
  await humanType(page, 'div[contenteditable="true"]', text);

  // ✅ Optional image upload
  if (imagePath) {
    const handle = await page.$('input[type="file"][accept*="image"]');
    if (handle) {
      await handle.uploadFile(imagePath).catch(() => {});
      await sleep(2000 + Math.random() * 2000);
    }
  }

  // ✅ Submit button
  const sendSelectors = [
    'div[data-testid="tweetButtonInline"]',
    'div[data-testid="tweetButton"]',
    'button[data-testid="tweetButtonInline"]'
  ];

  for (const selector of sendSelectors) {
    const btn = await page.$(selector);
    if (btn) {
      await btn.click().catch(() => {});
      await sleep(2000 + Math.random() * 2000);
      log.info('✅ Reply submitted successfully!');
      return true;
    }
  }

  log.warn('⚠️ Send button not found — selectors outdated.');
  return false;
}
