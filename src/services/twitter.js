import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, 'Opening profile');
  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 90000 });

  await humanScroll(page);

  const tweet = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    for (const a of articles) {
      const anchors = Array.from(a.querySelectorAll('a')).map(el => el.getAttribute('href') || '');
      const statusLink = anchors.find(h => /\/status\/\d+/.test(h));
      if (!statusLink) continue;
      const match = statusLink.match(/\/status\/(\d+)/);
      if (!match) continue;
      return {
        tweetId: match[1],
        url: `https://x.com${statusLink}`,
      };
    }
    return null;
  });

  if (!tweet) log.warn('⚠️ No tweets found — selectors may need update');
  return tweet;
}

export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, 'Opening tweet to reply');
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2500 + Math.random() * 2000);
  await humanScroll(page);

  // ✅ Click the "Reply" button
  const replyButtonSelector = 'button[data-testid="tweetButtonInline"]';
  const replyButton = await page.$(replyButtonSelector);
  if (!replyButton) {
    log.warn('⚠️ Reply button not found!');
    return false;
  }
  await replyButton.click();
  await sleep(2000 + Math.random() * 1500);

  // ✅ Find textarea for typing
  const inputSelector = 'div[contenteditable="true"]';
  await page.waitForSelector(inputSelector, { timeout: 20000 });
  await humanType(page, inputSelector, text);
  await sleep(1200 + Math.random() * 1500);

  // ✅ Upload image if exists
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        await sleep(2500 + Math.random() * 2500);
      } catch {
        log.warn('⚠️ Image upload failed, text-only reply');
      }
    }
  }

  // ✅ Submit reply using SAME BUTTON ID
  const submitButton = await page.$(replyButtonSelector);
  if (!submitButton) {
    log.warn('⚠️ Submit button missing!');
    return false;
  }
  await submitButton.click();
  await sleep(3000 + Math.random() * 2000);

  log.info('✅ Reply submitted successfully!');
  return true;
}
