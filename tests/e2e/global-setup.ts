/**
 * Playwright Global Setup
 * Ensures Tauri app is fully compiled and ready before tests run
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const baseURL = config.webServer?.url || 'http://localhost:1420';

  console.log('[Global Setup] Waiting for Tauri app to be ready...');

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const maxRetries = 60;
  const retryDelay = 2000;
  let attempt = 0;
  let appReady = false;

  while (attempt < maxRetries && !appReady) {
    try {
      attempt++;

      // Inject Tauri API mock before navigation
      await page.addInitScript(() => {
        // @ts-expect-error - Tauri API mock for testing
        window.__TAURI_INTERNALS__ = {
          invoke: async (cmd: string) => {
            switch (cmd) {
              case 'kopia_server_status':
                return { running: false, uptime: null };
              case 'repository_status':
                return { connected: false };
              default:
                return null;
            }
          },
        };
      });

      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForSelector('main', { timeout: 10000 });

      console.log('[Global Setup] App is ready!');
      appReady = true;
    } catch {
      if (attempt % 10 === 0) {
        console.log(`[Global Setup] Attempt ${attempt}/${maxRetries}...`);
      }
      await page.waitForTimeout(retryDelay);
    }
  }

  await browser.close();

  if (!appReady) {
    throw new Error(
      '[Global Setup] Tauri app failed to become ready. ' +
        'The Rust backend may still be compiling.'
    );
  }

  console.log('[Global Setup] Complete!');
}

export default globalSetup;
