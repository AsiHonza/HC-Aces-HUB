import { chromium, devices, type BrowserContext, type Page } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function performLogin(
  page: Page,
  email = process.env.CAPTURE_EMAIL || 'qa-visual-tester@aces.test',
  password = process.env.CAPTURE_PASSWORD || 'QaTest123456!'
) {
  console.log(`Authenticating as ${email}...`);
  await page.goto('http://localhost:9002/', { waitUntil: 'networkidle', timeout: 20000 });

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.text().includes('auth') || msg.text().includes('Firebase')) {
      console.log('PAGE LOG:', msg.text());
    }
  });

  const emailInput = page.locator('input[name="email"]');
  const passwordInput = page.locator('input[name="password"]');

  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  const submitButton = page.getByRole('button', { name: /Přihlásit se/i });
  await submitButton.click();

  console.log('Clicked login button, waiting 3s...');
  await page.waitForTimeout(3000);
  console.log('Current URL after click:', page.url());

  const errorToast = await page.locator('[data-sonner-toast], [role="status"], .destructive, [class*="destructive"]').allInnerTexts();
  if (errorToast.length > 0) {
    console.log('Toasts/alerts on page:', errorToast);
  }

  // Wait for redirect to /welcome or /dashboard
  if (page.url().includes('/welcome')) {
    console.log('On /welcome, waiting for redirect to /dashboard...');
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
  } else if (!page.url().includes('/dashboard')) {
    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {});
  }

  console.log('URL after waiting:', page.url());
  await page.waitForTimeout(1500);
}

async function capture() {
  const targetPath = process.argv[2] || '/dashboard';
  const url = `http://localhost:9002${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
  
  const outDir = path.resolve(process.cwd(), '.screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const userDataDir = path.join(outDir, '.chrome-profile');

  console.log(`Starting browser session for target: ${url}`);
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1280, height: 800 },
  });

  try {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    console.log(`Navigating desktop to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    const isLogin = page.url() === 'http://localhost:9002/' || (await page.locator('input[name="email"]').count()) > 0;

    if (isLogin) {
      console.log('Unauthenticated: performing login...');
      await performLogin(page);
      console.log(`Navigating to target after login: ${url}`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
    }

    // 1. Desktop Screenshot (1280x800)
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(600);
    const desktopFile = path.join(outDir, 'desktop.png');
    await page.screenshot({ path: desktopFile, fullPage: false });
    console.log(`✓ Saved desktop screenshot: ${desktopFile} (${page.url()})`);

    // 2. Mobile Screenshot (Pixel 5: 393x851)
    await page.setViewportSize({ width: 393, height: 851 });
    await page.waitForTimeout(800);
    const mobileFile = path.join(outDir, 'mobile.png');
    await page.screenshot({ path: mobileFile, fullPage: false });
    console.log(`✓ Saved mobile screenshot: ${mobileFile} (${page.url()})`);

    await context.close();
  } catch (err) {
    await context.close();
    throw err;
  }
}

capture().catch((err) => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
