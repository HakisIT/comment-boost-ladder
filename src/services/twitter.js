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

  await sleep(2500 + Math.random() * 2000);
  await humanScroll(page);

  const redReplyButton = 'button[data-testid="reply"]';

  // ✅ Click red reply count button to activate composer
  let clicked = false;
  for (let i = 0; i < 5; i++) {
    const btn = await page.$(redReplyButton);
    if (btn) {
      await btn.click().catch(() => {});
      log.info("✅ Red reply button clicked");
      clicked = true;
      break;
    }
    await humanScroll(page);
    await sleep(1000);
  }

  if (!clicked) {
    log.warn("⚠️ Reply button not found!");
    return false;
  }

  await sleep(2500);

  log.info("⬇️ Activating composer input...");

  // ✅ Click inside composer box until input appears
  async function enableInput() {
    for (let i = 0; i < 7; i++) {
      const composerZones = await page.$$('div[data-testid="replyTextbox"], [role="button"]');
      for (const zone of composerZones) {
        const box = await zone.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.down();
          await page.mouse.up();
        }
      }
      await sleep(1500);
      const editor = await page.$('div[contenteditable="true"]');
      if (editor) return true;
    }
    return false;
  }

  if (!await enableInput()) {
    log.warn("⚠️ Failed to activate composer — Reply aborted");
    return false;
  }

  log.info("✅ Input field active");
  await sleep(1200);
  await humanType(page, 'div[contenteditable="true"]', text);
  await sleep(1500 + Math.random() * 1500);

  // ✅ Optional image upload
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        log.info("📷 Image attached");
        await sleep(2500 + Math.random() * 2000);
      } catch (e) {
        log.warn("⚠️ Image upload failed — continuing");
      }
    }
  }

  // ✅ Submit reply button selector
  const greenSubmit = 'button[data-testid="tweetButtonInline"])';
  const submitBtn = await page.$(greenSubmit);

  if (!submitBtn) {
    log.warn("⚠️ Submit button not found!");
    return false;
  }

  await submitBtn.click().catch(() => {});
  await sleep(3500 + Math.random() * 2000);

  log.info("✅ Reply submitted successfully!");
  return true;
}
