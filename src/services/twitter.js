import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, 'Opening profile');
  await page.goto(profileUrl, {
    waitUntil: 'networkidle2',
    timeout: 90000
  });

  await humanScroll(page);

  const tweet = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll("article"));
    for (const a of articles) {
      const anchors = Array.from(a.querySelectorAll("a")).map(el => el.getAttribute("href") || "");
      const link = anchors.find(h => /\/status\/\d+/.test(h));
      if (!link) continue;
      const match = link.match(/\/status\/(\d+)/);
      if (!match) continue;
      return {
        tweetId: match[1],
        url: `https://x.com${link}`
      };
    }
    return null;
  });

  if (!tweet) {
    log.warn("⚠️ No tweets found on profile!");
    return null;
  }

  return tweet;
}

export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, "Opening tweet for reply");
  await page.goto(tweetUrl, {
    waitUntil: 'networkidle2',
    timeout: 90000
  });

  await sleep(2500);
  await humanScroll(page);

  const redReplyButton = 'button[data-testid="reply"]';

  // ✅ Click reply counter button to open composer
  let clicked = false;
  for (let i = 0; i < 5; i++) {
    const btn = await page.$(redReplyButton);
    if (btn) {
      await btn.click().catch(() => {});
      clicked = true;
      log.info("✅ Red reply button clicked");
      break;
    }
    await sleep(1000);
    await humanScroll(page);
  }

  if (!clicked) {
    log.warn("⚠️ Reply button not found!");
    return false;
  }

  await sleep(3000);

  log.info("⬇️ Activating composer…");

  // ✅ Click random UI areas within article to activate textbox
  async function activateComposer() {
    for (let attempt = 0; attempt < 7; attempt++) {
      const possibleZones = await page.$$('article div, div[data-testid="replyTextbox"]');
      for (const zone of possibleZones) {
        const box = await zone.boundingBox();
        if (!box) continue;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
          .catch(() => {});
      }
      await sleep(2000);

      const editor = await page.$('div[contenteditable="true"], div[role="textbox"]');
      if (editor) return true;
    }
    return false;
  }

  if (!await activateComposer()) {
    log.warn("⚠️ Could not activate composer input");
    return false;
  }

  log.info("✅ Input field ready");

  await sleep(1500);
  await humanType(page, 'div[contenteditable="true"], div[role="textbox"]', text);
  await sleep(1500);

  // ✅ Optional image
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        log.info("📷 Image attached");
        await sleep(3000);
      } catch {
        log.warn("⚠️ Image upload failed — text only");
      }
    }
  }

  // ✅ Submit button is SAME testid as the reply button inside composer
  const submitButton = 'button[data-testid="tweetButtonInline"]';
  const btn = await page.$(submitButton);

  if (!btn) {
    log.warn("⚠️ Submit button missing!");
    return false;
  }

  await btn.click().catch(() => {});
  await sleep(4000);

  log.info("✅ Reply submitted successfully!");
  return true;
}
