import { log } from '../utils/logger.js';
import { humanScroll, waitVisible, sleep, humanType } from '../utils/human.js';
export async function getLatestTweetFromProfile(page, profileUrl) {
  log.info({ profileUrl }, 'Opening profile');
  await page.goto(profileUrl, { waitUntil: 'networkidle2', timeout: 60000 });
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
  if (!tweet) log.warn({ profileUrl }, 'No tweet found on profile');
  return tweet;
}
export async function replyToTweet(page, tweetUrl, text, imagePath) {
  log.info({ tweetUrl }, 'Opening tweet for reply');
  await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(800 + Math.random() * 1200);
  const replySelectors = [
    'div[data-testid="reply"] button',
    'div[data-testid="replyButton"] button',
    'div[role="button"][aria-label*="Reply"]'
  ];
  let clicked = false;
  for (const s of replySelectors) {
    try {
      const el = await page.$(s);
      if (el) { await el.click(); clicked = true; break; }
    } catch (err) {}
  }
  if (!clicked) return false;
  await waitVisible(page, 'div[role="dialog"] div[contenteditable="true"], div[contenteditable="true"][data-testid="tweetTextarea_0"]', 10000);
  await sleep(300 + Math.random() * 600);
  const composerSelector = 'div[role="dialog"] div[contenteditable="true"], div[contenteditable="true"][data-testid="tweetTextarea_0"]';
  await humanType(page, composerSelector, text);
  await sleep(500 + Math.random() * 700);
  if (imagePath) {
    const fileInputSelector = 'input[type="file"][accept*="image"]';
    const fileInput = await page.$(fileInputSelector);
    if (fileInput) { try { await fileInput.uploadFile(imagePath); await sleep(1500 + Math.random() * 1200); } catch (err) {} }
  }
  const sendSelectors = [
    'div[data-testid="tweetButton"]',
    'div[data-testid="tweetButtonInline"]',
    'div[role="button"][data-testid="replySubmitButton"]'
  ];
  for (const s of sendSelectors) {
    const btn = await page.$(s);
    if (btn) { await btn.click(); await sleep(2000 + Math.random() * 2000); return true; }
  }
  return false;
}
