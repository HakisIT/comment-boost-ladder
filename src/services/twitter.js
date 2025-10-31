import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

const REPLY_OPEN_SELECTOR = 'button[data-testid="reply"]'; // red reply button
const SUBMIT_SELECTOR = 'button[data-testid="tweetButtonInline"]'; // green submit button
const INPUT_SELECTOR = 'div[contenteditable="true"]';

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
        url: `https://x.com${statusLink}`
      };
    }
    return null;
  });

  return tweet;
}

export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, 'Opening tweet to reply');
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000 + Math.random() * 2000);

  // Scroll to reveal reply button
  await humanScroll(page);

  // Try clicking reply button up to 5 times with scroll adjustments
  let clicked = false;
  for (let i = 0; i < 5; i++) {
    const replyButton = await page.$(REPLY_OPEN_SELECTOR);
    if (replyButton) {
      await replyButton.click().catch(() => {});
      clicked = true;
      log.info("✅ Reply button clicked");
      break;
    }
    await humanScroll(page);
    await sleep(1000);
  }

  if (!clicked) {
    log.warn('⚠️ Could not click red reply button');
    return false;
  }

  // Wait for input box
  try {
    await page.waitForSelector(INPUT_SELECTOR, { visible: true, timeout: 20000 });
  } catch {
    log.warn("⚠️ Reply input not found");
    return false;
  }

  await sleep(1500);
  await humanType(page, INPUT_SELECTOR, text);
  await sleep(1000 + Math.random() * 1500);

  // Upload image (optional)
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        await sleep(2500 + Math.random() * 2000);
      } catch {
        log.warn('⚠️ Image upload failed → sending text-only');
      }
    }
  }

  // Click green "Reply" to submit
  const submitButton = await page.$(SUBMIT_SELECTOR);
  if (submitButton) {
    await submitButton.click().catch(() => {});
    await sleep(3000 + Math.random() * 2000);
    log.info("✅ Reply submitted successfully!");
    return true;
  }

  log.warn("⚠️ Submit button not found");
  return false;
}
