import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

const SELECTORS = {
  replyButton: 'button[data-testid="reply"]',
  inputBox: 'div[data-testid="tweetTextarea_0"]',
  submitButton: 'button[data-testid="tweetButtonInline"]'
};

export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, "Opening profile");
  await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 90000 });
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

// ✅ Ensure reply area becomes active
log.info("⬇️ Activating reply textbox");

const activationSelectors = [
  'div[data-testid="tweetTextarea_0RichTextInputContainer"]',
  'div[aria-label="Post text"]',
  'div[contenteditable="true"]'
];

async function activateReplyBox() {
  for (let attempt = 0; attempt < 7; attempt++) {
    for (const sel of activationSelectors) {
      const boxHandle = await page.$(sel);
      if (boxHandle) {
        const box = await boxHandle.boundingBox();
        if (box) {
          await page.mouse.move(box.x + box.width / 3, box.y + box.height / 2);
          await page.mouse.click(box.x + box.width / 3, box.y + box.height / 2);
        }
      }
    }
    await sleep(1500);

    const editor = await page.$('div[data-testid="tweetTextarea_0"]');
    if (editor) {
      log.info("✅ Textbox activated!");
      return true;
    }

    await humanScroll(page);
  }
  return false;
}

if (!await activateReplyBox()) {
  log.warn("⚠️ Could not activate reply textbox");
  return false;
}
