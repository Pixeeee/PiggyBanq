import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: process.env.RELEASE_BROWSER_EXECUTABLE ?? '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox'] });
try {
  for (const viewport of [{ width: 2394, height: 1132 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(`${process.env.RELEASE_WEB_URL ?? 'http://127.0.0.1:3010'}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Create a local wallet', exact: true }).click();
    await page.evaluate(()=>document.fonts.ready);
    assert.match(await page.locator('.stellar-auth-card h2').first().evaluate(el=>getComputedStyle(el).fontFamily),/grandstander/i);
    assert.match(await page.locator('.stellar-auth-card input').first().evaluate(el=>getComputedStyle(el).fontFamily),/geist/i);
    const geometry = await page.locator('.stellar-auth-card').evaluate(el => {
      const style = getComputedStyle(el), rect = el.getBoundingClientRect();
      return { padding: parseFloat(style.paddingLeft), radius: parseFloat(style.borderTopLeftRadius), left: rect.left, right: rect.right, viewport: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.ok(geometry.padding >= 20, 'Signup card needs inner spacing.');
    assert.ok(geometry.radius >= 20, 'Signup card should match the rounded login card.');
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport && !geometry.overflow, 'Signup must fit the viewport.');
    await page.screenshot({ path: `qa-screenshots/signup-card-${viewport.width}.png`, fullPage: true, animations: 'disabled' });
    await context.close();
  }
  console.log('PASS: signup card spacing, corners and viewport fit at desktop and phone widths.');
} finally { await browser.close(); }
