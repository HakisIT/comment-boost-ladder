import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

const RED_REPLY_SELECTOR = 'button[data-testid="reply"]'; // Opens composer
let INPUT_SELECTOR = 'div[contenteditable="true"]';
const SUBMIT_SELECTOR = 'button[data-testid="tweetButtonInline"]';

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

  if (!tweet) log.warn('⚠️ No tweets found on profile!');
  return tweet;
}

export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, 'Opening tweet to reply');
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
  await sleep(2000 + Math.random() * 2000);

  await humanScroll(page);

  // ✅ Click red reply button to open inline composer
  let clicked = false;
  for (let i = 0; i < 5; i++) {
    const btn = await page.$(RED_REPLY_SELECTOR);
    if (btn) {
      await btn.click().catch(() => {});
      clicked = true;
      log.info('✅ Reply button clicked');
      break;
    }
    await humanScroll(page);
    await sleep(1000);
  }

  if (!clicked) {
    log.warn('⚠️ Reply button not found!');
    return false;
  }

  await sleep(2000 + Math.random() * 1500);

  // ✅ Activate inline reply area by clicking inside the reply zone
  const inlineReply = await page.$('div[data-testid="replyTextbox"]');
  if (inlineReply) {
    await inlineReply.click().catch(() => {});
    await sleep(2000 + Math.random() * 1500);
    log.info("✅ Inline reply box activated");
  }

  // ✅ Multiple fallback selectors for input
  const inputSelectors = [
    'div[contenteditable="true"]',
    'div[data-testid="tweetTextarea_0"]',
    '[role="textbox"][contenteditable="true"]'
  ];

  let inputReady = false;
  for (const selector of inputSelectors) {
    try {
      await page.waitForSelector(selector, { visible: true, timeout: 5000 });
      INPUT_SELECTOR = selector;
      inputReady = true;
      log.info({ selector }, "✅ Input field ready");
      break;
    } catch {}
  }

  if (!inputReady) {
    log.warn("⚠️ Reply input not found — stopping");
    return false;
  }

  await humanType(page, INPUT_SELECTOR, text);
  await sleep(1500 + Math.random() * 1500);

  // ✅ Upload image if available
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        await sleep(2500 + Math.random() * 2000);
        log.info("📷 Image attached");
      } catch {
        log.warn("⚠️ Image upload failed — continuing text-only");
      }
    }
  }

  // ✅ Click green reply button to submit
  const submitButton = await page.$(SUBMIT_SELECTOR);
  if (!submitButton) {
    log.warn("⚠️ Submit button missing!");
    return false;
  }
  await submitButton.click().catch(() => {});
  await sleep(3000 + Math.random() * 2000);

  log.info("✅ Reply submitted successfully!");
  return true;
}
