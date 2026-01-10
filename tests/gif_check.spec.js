import { test, expect } from '@playwright/test';

test('Check GIF functionality', async ({ page }) => {
  // 1. Go to homepage
  await page.goto('http://localhost:3000/');
  
  // 2. Click a calendar day to open modal (or navigate)
  // Let's force navigate to workout start
  await page.goto('http://localhost:3000/workout/start?routine=Pecho%20%2F%20Espalda');
  
  // 3. Wait for exercises to load
  await expect(page.getByText('Press Inclinado con Mancuernas')).toBeVisible({ timeout: 10000 });

  // 4. Click the GIF button for first exercise
  const gifBtn = page.locator('button').filter({ hasText: 'Ver técnica' }).first();
  await gifBtn.click();
  
  // 5. Check Modal Open
  const modal = page.locator('div.fixed.inset-0.z-50');
  await expect(modal).toBeVisible();
  
  // 6. Check Image src is valid (not 404)
  const img = modal.locator('img');
  await expect(img).toBeVisible();
  
  const src = await img.getAttribute('src');
  console.log('GIF Src found:', src);
  expect(src).toContain('free-exercise-db');
  
  // Optional: check response status of the image
  const response = await page.request.get(src);
  expect(response.status()).toBe(200);

});
