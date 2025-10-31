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
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 70000 });
  await sleep(1500 + Math.random() * 1500);

  // ✅ Improved reply button selectors for new Twitter UI
  const replySelectors = [
    'div[data-testid="reply"]',
    'div[data-testid="replyButtonInline"]',
    'div[data-testid="replyButton"]',
    'button[data-testid="milkdown-toolbar-reply-button"]',
    'div[aria-label*="Reply"]',
    'button[aria-label*="Reply"]',
    'div[data-testid="toolBar"] [aria-label*="Reply"]',
    'button[role="button"][data-testid="reply"]'
  ];

  let clicked = false;
  for (const selector of replySelectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        clicked = true;
        break;
      }
    } catch {}
  }

  if (!clicked) {
    log.warn('⚠️ Failed to click Reply — selectors may need update.');
    return false;
  }

  await sleep(1000 + Math.random() * 2000);

  // ✅ Wait for input field to appear
  await page.waitForSelector('div[contenteditable="true"]', {
    timeout: 20000,
    visible: true
  });

  // ✅ Type comment like a human
  await humanType(page, 'div[contenteditable="true"]', text);
  await sleep(1200 + Math.random() * 1500);

  // ✅ Image upload support
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        await sleep(2000 + Math.random() * 2500);
      } catch (err) {
        log.warn('⚠️ Image upload failed → sending text only');
      }
    }
  }

  // ✅ Improved submit button selectors
  const sendSelectors = [
    'div[data-testid="tweetButton"]',
    'div[data-testid="tweetButtonInline"]',
    'button[data-testid="tweetButtonInline"]',
    'button[data-testid="dmComposerSendButton"]'
  ];

  for (const selector of sendSelectors) {
    try {
      const btn = await page.$(selector);
      if (btn) {
        await btn.click();
        await sleep(2000 + Math.random() * 2000);
        log.info('✅ Reply submitted successfully');
        return true;
      }
    } catch {}
  }

  log.warn('⚠️ Reply submit button not found — selectors need update.');
  return false;
}
