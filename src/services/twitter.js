import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

const SELECTORS = {
  replyButton: 'button[data-testid="reply"]',
  inputEditable: 'div[data-testid="tweetTextarea_0"]',
  inputContainer: 'div[data-testid="tweetTextarea_0RichTextInputContainer"]',
  submitButton: 'button[data-testid="tweetButtonInline"]'
};

export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, "Opening profile");
  await page.goto(profileUrl, {
    waitUntil: "networkidle2",
    timeout: 90000
  });

  await sleep(2000);
  await humanScroll(page);

  const tweet = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll("article"));
    for (const a of articles) {
      const anchor = Array.from(a.querySelectorAll("a"))
        .map(e => e.getAttribute("href"))
        .find(h => h && /\/status\/\d+/.test(h));
      if (!anchor) continue;
      const idMatch = anchor.match(/\/status\/(\d+)/);
      if (!idMatch) continue;
      return { tweetId: idMatch[1], url: `https://x.com${anchor}` };
    }
    return null;
  });

  if (!tweet) log.warn("⚠ No tweets found");
  return tweet;
}

export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, "Opening tweet to reply");
  await page.goto(tweetUrl, {
    waitUntil: "networkidle2",
    timeout: 90000
  });

  await sleep(2500);
  await humanScroll(page);

  // ✅ Click reply icon
  const replyBtn = await page.$(SELECTORS.replyButton);
  if (!replyBtn) {
    log.warn("⚠ Reply button not found");
    return false;
  }
  await replyBtn.click();
  log.info("✅ Reply button clicked");
  await sleep(3000);

  // ✅ Activate textbox with real mouse clicks
  log.info("⬇️ Activating reply textbox");

  async function activateReplyBox() {
    for (let attempt = 0; attempt < 8; attempt++) {
      const zone = await page.$(SELECTORS.inputContainer);
      if (zone) {
        const box = await zone.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        }
      }

      await sleep(2000);

      const editor = await page.$(SELECTORS.inputEditable);
      if (editor) {
        log.info("✅ Textbox activated!");
        return true;
      }

      await humanScroll(page);
    }
    return false;
  }

  if (!await activateReplyBox()) {
    log.warn("⚠ Could not activate reply textbox");
    return false;
  }

  // ✅ Type reply
  await humanType(page, SELECTORS.inputEditable, text);
  await sleep(2000);

  // ✅ Upload image if provided
  if (imagePath) {
    const fileInput = await page.$('input[type="file"][accept*="image"]');
    if (fileInput) {
      try {
        await fileInput.uploadFile(imagePath);
        log.info("📷 Image attached");
        await sleep(3000);
      } catch {
        log.warn("⚠ Image upload failed");
      }
    }
  }

  // ✅ Submit reply
  const submitBtn = await page.$(SELECTORS.submitButton);
  if (!submitBtn) {
    log.warn("⚠ Submit button missing!");
    return false;
  }
  await submitBtn.click();
  log.info("✅ Reply submitted!");

  await sleep(4000);
  return true;
}
