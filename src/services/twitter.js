import { log } from '../utils/logger.js';
import { humanScroll, sleep, humanType } from '../utils/human.js';

//
// Selectors confirmed from your screenshots/HTML
//
const SEL = {
  // opens the reply composer (red reply icon / counter row)
  openReply: 'button[data-testid="reply"]',

  // the clickable container that activates the editor
  inputContainer: 'div[data-testid="tweetTextarea_0RichTextInputContainer"]',

  // the real editable DraftJS node we type into
  inputEditable: 'div[data-testid="tweetTextarea_0"]',

  // the correct submit button on your account (white “Reply”)
  submitReply: 'button[data-testid="tweetButton"]',

  // safety: crop modal (we should close if it pops)
  cropModal: 'div[aria-label="Crop media"]',

  // generic file input Twitter exposes when the composer is open
  fileInput: 'input[type="file"][accept*="image"]',
};

/**
 * Scrape newest tweet URL from a public profile page.
 * Returns: { tweetId, url } or null
 */
export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, 'Opening profile');
  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 90_000 });
  await sleep(1_000 + Math.random() * 1_500);
  await humanScroll(page);

  const tweet = await page.evaluate(() => {
    const articles = Array.from(document.querySelectorAll('article'));
    for (const a of articles) {
      const anchors = Array.from(a.querySelectorAll('a')).map(el => el.getAttribute('href') || '');
      const link = anchors.find(h => /\/status\/\d+/.test(h));
      if (!link) continue;
      const m = link.match(/\/status\/(\d+)/);
      if (!m) continue;
      return { tweetId: m[1], url: `https://x.com${link}` };
    }
    return null;
  });

  if (!tweet) log.warn('⚠️ No tweets found on profile (UI may have changed).');
  return tweet;
}

/**
 * Post a reply (text + single image) to a tweet.
 * - Uses your confirmed selectors.
 * - Avoids clicking the image preview (prevents "Crop media" trap).
 * - Auto-closes crop modal if it appears.
 */
export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, 'Opening tweet for reply');
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 90_000 });
  await sleep(1_500 + Math.random() * 1_500);
  await humanScroll(page);

  // 1) Open composer
  const openBtn = await page.$(SEL.openReply);
  if (!openBtn) {
    log.warn('⚠️ Reply (open) button not found.');
    await screenshotDebug(page, 'no_open_button');
    return false;
  }
  await openBtn.click().catch(() => {});
  log.info('✅ Reply button clicked');
  await sleep(1_000 + Math.random() * 1_000);

  // 2) Ensure reply area is focused & editable is present
  // click the container to activate DraftJS if needed
  for (let attempt = 0; attempt < 6; attempt++) {
    const editable = await page.$(SEL.inputEditable);
    if (editable) break;

    const boxHandle = await page.$(SEL.inputContainer);
    if (boxHandle) {
      const box = await boxHandle.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + Math.min(box.height - 4, 24));
        await page.mouse.down();
        await page.mouse.up();
      } else {
        await boxHandle.click().catch(() => {});
      }
    }
    await sleep(800);
  }

  const hasInput = await page.$(SEL.inputEditable);
  if (!hasInput) {
    log.warn('⚠️ Reply input not found / not activated.');
    await screenshotDebug(page, 'no_input');
    return false;
  }
  log.info('✅ Reply input ready');

  // 3) Type the text (human-like)
  await humanType(page, SEL.inputEditable, text);
  await sleep(900 + Math.random() * 900);

  // 4) Attach ONE image (your requirement: do NOT allow multiple)
  if (imagePath) {
    const input = await page.$(SEL.fileInput);
    if (input) {
      try {
        await input.uploadFile(imagePath);
        log.info({ imagePath }, '📷 Image attached');
        // give time for preview to render
        await sleep(2_000 + Math.random() * 1_500);
      } catch (e) {
        log.warn({ err: String(e) }, '⚠️ Image upload failed — continuing with text only');
      }
    } else {
      log.warn('⚠️ File input not found — skipped image.');
    }
  }

  // Safety: if crop modal popped for any reason, close it.
  const maybeCrop = await page.$(SEL.cropModal);
  if (maybeCrop) {
    log.warn('⚠️ Crop media modal detected — closing via ESC');
    await page.keyboard.press('Escape');
    await sleep(800);
  }

  // Defocus the image preview area so the next click won't hit the image.
  await page.mouse.move(50 + Math.floor(Math.random() * 60), 80 + Math.floor(Math.random() * 60));
  await sleep(250);

  // 5) Click the correct "Reply" submit button (tweetButton on your UI)
  const submit = await waitOneOf(page, [SEL.submitReply], 12_000);
  if (!submit) {
    log.warn('⚠️ Submit Reply button not found.');
    await screenshotDebug(page, 'no_submit_button');
    return false;
  }
  // Scroll submit into view & click
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  }, SEL.submitReply);
  await sleep(350 + Math.random() * 400);
  await page.click(SEL.submitReply).catch(() => {});
  await sleep(2_500 + Math.random() * 1_500);

  log.info('✅ Reply submitted successfully!');
  return true;
}

/* ------------- helpers ------------- */

async function waitOneOf(page, selectors, timeoutMs = 10_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    for (const sel of selectors) {
      const el = await page.$(sel);
      if (el) return sel;
    }
    await sleep(300);
  }
  return null;
}

async function screenshotDebug(page, tag) {
  try {
    const path = `./data/debug_${tag}_${Date.now()}.png`;
    await page.screenshot({ path, fullPage: true });
    log.info({ path }, '🖼 Saved debug screenshot');
  } catch {}
}
