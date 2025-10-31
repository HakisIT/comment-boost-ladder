import 'dotenv/config.js';
import { launchBrowser } from './browser.js';
import { replyToTweet } from './services/twitter.js';
import { log } from './utils/logger.js';
import { getRandomComment, getRandomImage, loadProfiles } from './utils/data.js';

(async () => {
  try {
    const { page } = await launchBrowser();
    
    const commentText = getRandomComment();
    const imagePath = getRandomImage();

    // ✅ FIXED MODE: reply to one known tweet
    const fixedTweetUrl = "https://x.com/elonmusk/status/1519480761749016577";
    log.info({ fixedTweetUrl }, '🎯 Replying to fixed tweet for testing');

    const success = await replyToTweet(page, fixedTweetUrl, commentText, imagePath);

    if (!success) {
      log.error('❌ Failed to reply. Check VNC screen + logs.');
      process.exit(1);
    }

    log.info('✅ ✅ ✅ AUTOMATED REPLY SUCCESSFULLY POSTED!');
    await page.waitForTimeout(3000);
    process.exit(0);

  } catch (err) {
    log.error({ err: err.message }, '🔥 FATAL ERROR IN MAIN SCRIPT');
    process.exit(1);
  }
})();
