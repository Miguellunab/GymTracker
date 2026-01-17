const { test, expect } = require('@playwright/test');

test.describe('Coach AI Features', () => {

  test('Daily Coach Tip loads on dashboard', async ({ page }) => {
    // Mock the daily coach API to return a predictable response
    await page.route('*/**/api/coach/daily', async route => {
      const json = { 
          message: "Este es un consejo de prueba generado por la IA.", 
          action: "Prueba Exitosa" 
      };
      await route.fulfill({ json });
    });

    // Go to Dashboard
    await page.goto('http://localhost:3000/');

    // Check if the tip component appears
    const tipBox = page.locator('text=Consejo Diario');
    await expect(tipBox).toBeVisible();

    // Check content
    await expect(page.locator('text=Este es un consejo de prueba')).toBeVisible();
    await expect(page.locator('text=Prueba Exitosa')).toBeVisible();
  });

  test('Post-workout Feedback appears after saving', async ({ page }) => {
    // 1. Mock routine API
    await page.route('*/**/api/routines?name=*', async route => {
         await route.fulfill({ json: { exercises: [{ id: 'ex1', name: 'Press Banca', muscle: 'Pecho' }] } });
    });

    // 2. Mock Feedback API
    await page.route('*/**/api/coach/feedback', async route => {
        await route.fulfill({ json: { message: "¡Entrenamiento legendario!", rating: 5 } });
    });

    // 3. Mock Save API
    await page.route('*/**/api/workouts', async route => {
        await route.fulfill({ status: 200, json: { success: true } });
    });

    // Navigate to workout start
    await page.goto('http://localhost:3000/workout/start?routine=TestRoutine');
    
    // Finish Workout Flow
    await page.click('text=FINALIZAR'); // Open modal
    
    // Fill duration manually
    const durationInput = page.locator('input[placeholder="60"]');
    await durationInput.fill('45');
    
    await page.click('text=Continuar'); // Go to step 2 (calories)
    
    // Click Save
    await page.click('text=GUARDAR WORKOUT');

    // Expect Feedback Component instead of redirect
    await expect(page.locator('text=Análisis del Coach')).toBeVisible({ timeout: 10000 });
    // Note: The text might be inside quotes or not, depending on how it's rendered. 
    // Let's look for the text content directly without strict quote matching in selector if possible, or adjust.
    await expect(page.getByText('¡Entrenamiento legendario!')).toBeVisible();
    
    // Verify dismissal redirects home
    await page.click('text=Entendido');
    await expect(page).toHaveURL('http://localhost:3000/');
  });

});
