import { chromium } from 'playwright';
import { uploadScreenshot } from './supabase';

export type BrowserValidationResult = {
  status: 'passed' | 'failed';
  summary: string;
  notes: string;
};

const NAV_TIMEOUT_MS = 60_000;
const NETWORK_IDLE_TIMEOUT_MS = 15_000;
const SETTLE_MS = 2_000;
const MAX_CONSOLE_ERRORS = 5;

export async function validateDeployment(input: {
  diffId: string;
  url: string;
}): Promise<BrowserValidationResult> {
  const browser = await chromium.launch();
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  try {
    const page = await browser.newPage();
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    let httpStatus = 0;
    try {
      const response = await page.goto(input.url, {
        waitUntil: 'networkidle',
        timeout: NETWORK_IDLE_TIMEOUT_MS,
      });
      httpStatus = response?.status() ?? 0;
    } catch {
      const response = await page
        .goto(input.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS })
        .catch(() => null);
      httpStatus = response?.status() ?? 0;
    }

    if (httpStatus === 0) {
      return {
        status: 'failed',
        summary: 'page did not load',
        notes: JSON.stringify({ url: input.url, error: 'navigation failed' }),
      };
    }

    await page.waitForTimeout(SETTLE_MS);
    const png = await page.screenshot({ type: 'png', fullPage: true });

    let screenshotUrl: string | null = null;
    try {
      const upload = await uploadScreenshot(
        `validation/${input.diffId}/${Date.now()}.png`,
        png,
      );
      screenshotUrl = upload.publicUrl;
    } catch {
      screenshotUrl = null;
    }

    const passed =
      httpStatus < 400 && pageErrors.length === 0 && consoleErrors.length <= MAX_CONSOLE_ERRORS;

    return {
      status: passed ? 'passed' : 'failed',
      summary: `HTTP ${httpStatus}, ${pageErrors.length} page errors, ${consoleErrors.length} console errors`,
      notes: JSON.stringify({
        url: input.url,
        httpStatus,
        pageErrors: pageErrors.slice(0, MAX_CONSOLE_ERRORS),
        consoleErrors: consoleErrors.slice(0, MAX_CONSOLE_ERRORS),
        screenshotUrl,
      }),
    };
  } catch (error) {
    return {
      status: 'failed',
      summary: 'validation crashed',
      notes: JSON.stringify({
        url: input.url,
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  } finally {
    await browser.close();
  }
}
