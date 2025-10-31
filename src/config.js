import 'dotenv/config';

export const cfg = {
  cookiesPath: process.env.COOKIES_PATH || './secrets/cookies.main.json',
  headless: (process.env.HEADLESS ?? 'true').toLowerCase() === 'true',
  ua: process.env.USER_AGENT || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
  profilesFile: process.env.PROFILES_FILE || './data/profiles.txt',
  commentsFile: process.env.COMMENTS_FILE || './data/comments.txt',
  imagesDir: process.env.IMAGES_DIR || './data/images',
  processedPath: process.env.PROCESSED_PATH || './data/processed.json',
  runIntervalMs: Number(process.env.RUN_INTERVAL_MS || 300000),
  maxProfilesPerRun: Number(process.env.MAX_PROFILES_PER_RUN || 50),
  oneReplyPerRun: (process.env.ONE_REPLY_PER_RUN ?? 'true').toLowerCase() === 'true',
}
