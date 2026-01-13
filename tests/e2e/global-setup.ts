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

  // Increase retries for CI where Rust compilation can be slow
  const maxRetries = 90; // 3 minutes total (90 * 2s)
  const retryDelay = 2000;
  let attempt = 0;
  let appReady = false;

  while (attempt < maxRetries && !appReady) {
    try {
      attempt++;

      // Inject comprehensive Tauri API mock before navigation
      await page.addInitScript(() => {
        // @ts-expect-error - Tauri API mock for testing
        window.__TAURI_INTERNALS__ = {
          // eslint-disable-next-line @typescript-eslint/require-await
          invoke: async (cmd: string) => {
            switch (cmd) {
              case 'kopia_server_status':
                return { running: false, server_url: null, port: null, uptime: null };
              case 'repository_status':
                return { connected: false };
              case 'list_repositories':
                return ['repository'];
              case 'sources_list':
                return { sources: [] };
              case 'snapshots_list':
                return [];
              case 'policies_list':
                return [];
              case 'tasks_list':
                return [];
              case 'tasks_summary':
                return { counters: {} };
              case 'maintenance_info':
                return { params: {}, schedule: {} };
              case 'mounts_list':
                return [];
              case 'notification_profiles_list':
                return [];
              default:
                return null;
            }
          },
        };
      });

      await page.goto(baseURL, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Wait for any of these elements that indicate the app has rendered:
      // - main: The main content area (AppLayout)
      // - [data-testid="onboarding"]: Onboarding page
      // - .setup-page, form: Setup page elements
      // Use a more lenient selector that catches any rendered state
      await page.waitForFunction(
        () => {
          return (
            document.querySelector('main') !== null ||
            document.querySelector('form') !== null ||
            document.querySelector('button') !== null ||
            document.querySelector('[role="button"]') !== null
          );
        },
        { timeout: 15000 }
      );

      console.log('[Global Setup] App is ready!');
      appReady = true;
    } catch (e) {
      if (attempt % 10 === 0) {
        const error = e instanceof Error ? e.message : String(e);
        console.log(`[Global Setup] Attempt ${attempt}/${maxRetries}... (${error})`);
      }
      await page.waitForTimeout(retryDelay);
    }
  }

  await browser.close();

  if (!appReady) {
    throw new Error(
      '[Global Setup] Tauri app failed to become ready after ' +
        `${maxRetries * (retryDelay / 1000)} seconds. ` +
        'The Rust backend may still be compiling or the app failed to start.'
    );
  }

  console.log('[Global Setup] Complete!');
}

export default globalSetup;
