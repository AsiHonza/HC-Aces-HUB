import { chromium, devices } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';

async function capture() {
  const targetPath = process.argv[2] || '/dashboard/hall-of-fame';
  const url = `http://localhost:9002${targetPath.startsWith('/') ? targetPath : '/' + targetPath}`;
  
  const outDir = path.resolve(process.cwd(), '.screenshots');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  try {
    // 1. Desktop screenshot
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const desktopPage = await desktopContext.newPage();
    console.log(`Navigating desktop to: ${url}`);
    await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait an extra 500ms for animations to settle
    await desktopPage.waitForTimeout(600);
    const desktopFile = path.join(outDir, 'desktop.png');
    await desktopPage.screenshot({ path: desktopFile, fullPage: false });
    console.log(`Saved desktop screenshot: ${desktopFile}`);
    await desktopContext.close();

    // 2. Mobile screenshot (Pixel 5 - Kabinový pohled)
    const mobileDevice = devices['Pixel 5'] || { viewport: { width: 393, height: 851 }, userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' };
    const mobileContext = await browser.newContext({
      ...mobileDevice,
    });
    const mobilePage = await mobileContext.newPage();
    console.log(`Navigating mobile to: ${url}`);
    await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await mobilePage.waitForTimeout(600);
    const mobileFile = path.join(outDir, 'mobile.png');
    await mobilePage.screenshot({ path: mobileFile, fullPage: false });
    console.log(`Saved mobile screenshot: ${mobileFile}`);
    await mobileContext.close();
  } finally {
    await browser.close();
  }
}

capture().catch((err) => {
  console.error('Error capturing screenshot:', err);
  process.exit(1);
});
