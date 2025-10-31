import puppeteer from 'puppeteer';
import fs from 'fs-extra';
import { cfg } from '../config.js';
import { log } from '../utils/logger.js';
export async function launchBrowser() {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1200,800',
    '--disable-blink-features=AutomationControlled'
  ];
  const launchOptions = { headless: cfg.headless, args };
  if (cfg.executablePath) launchOptions.executablePath = cfg.executablePath;
  const browser = await puppeteer.launch({
  headless: cfg.headless === 'true' ? true : false,
  defaultViewport: { width: 1280, height: 900 },
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
  ]
});
  log.info({ headless: cfg.headless }, 'Browser launched');
  return browser;
}
export async function newPageWithCookies(browser) {
  const page = await browser.newPage();
  await page.setUserAgent(cfg.ua);
  await page.setExtraHTTPHeaders({ 'accept-language': 'en-US,en;q=0.9' });
  await page.setViewport({ width: 1200, height: 800 });
  if (await fs.pathExists(cfg.cookiesPath)) {
    try {
      const cookies = await fs.readJson(cfg.cookiesPath);
      if (Array.isArray(cookies) && cookies.length) {
        await page.setCookie(...cookies);
      }
    } catch (err) {}
  }
  return page;
}
