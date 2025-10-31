import 'dotenv/config';
import fs from 'fs-extra';
import puppeteer from 'puppeteer';
import { cfg } from '../src/config.js';
(async () => {
  const browser = await puppeteer.launch({
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  defaultViewport: null,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--start-maximized'
  ]
});
  const page = await browser.newPage();
  await page.setUserAgent(cfg.ua);
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('https://x.com/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000 + Math.random() * 2000));
  process.stdin.setEncoding('utf8');
  process.stdin.once('data', async () => {
    const cookies = await page.cookies();
    await fs.outputJson(cfg.cookiesPath, cookies, { spaces: 2 });
    await browser.close();
    process.exit(0);
  });
})();
