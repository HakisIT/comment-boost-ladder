export const sleep = (ms) => new Promise(r => setTimeout(r, ms));
export const jitter = (base, spread = base * 0.35) =>
  Math.max(0, Math.round(base + (Math.random() * 2 - 1) * spread));
export async function humanType(page, selector, text) {
  await page.focus(selector);
  for (const ch of text) {
    await page.keyboard.type(ch, { delay: 50 + Math.floor(Math.random() * 80) });
    if (Math.random() < 0.02) await sleep(120 + Math.random() * 300);
  }
}
export async function humanScroll(page) {
  const steps = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: 150 + Math.random() * 300 });
    await sleep(200 + Math.random() * 600);
  }
}
export async function waitVisible(page, selector, timeout = 15000) {
  await page.waitForSelector(selector, { visible: true, timeout });
}
