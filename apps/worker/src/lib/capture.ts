import { chromium, type Page } from 'playwright';

const NAV_TIMEOUT_MS = 60_000;
const NETWORK_IDLE_TIMEOUT_MS = 15_000;
const SETTLE_MS = 2_000;
const SECTION_TIMEOUT_MS = 10_000;
const PREFLIGHT_TIMEOUT_MS = 10_000;

export async function isReachable(url: string): Promise<boolean> {
  try {
    await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
    });
    return true;
  } catch {
    try {
      await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS),
      });
      return true;
    } catch {
      return false;
    }
  }
}

async function gotoPage(page: Page, url: string): Promise<void> {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: NETWORK_IDLE_TIMEOUT_MS });
  } catch {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);
  }
}

export async function captureDom(url: string): Promise<string> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await gotoPage(page, url);
    return await page.content();
  } finally {
    await browser.close();
  }
}

export async function screenshotStoredDom(html: string, selector: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    return await captureSection(page, selector);
  } finally {
    await browser.close();
  }
}

export async function screenshotLiveSection(url: string, selector: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await gotoPage(page, url);
    return await captureSection(page, selector);
  } finally {
    await browser.close();
  }
}

async function captureSection(page: Page, selector: string): Promise<Buffer> {
  try {
    const locator = page.locator(selector).first();
    await locator.waitFor({ state: 'visible', timeout: SECTION_TIMEOUT_MS });
    return await locator.screenshot({ type: 'png' });
  } catch {
    return await page.screenshot({ type: 'png', fullPage: true });
  }
}
