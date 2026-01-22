/**
 * Tests unitarios para los servicios del Bot
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

test.describe('Bot Services - Via API', () => {

  test.describe('Routines Service', () => {
    
    test('GET /api/routines/list returns routines', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/routines/list`);
      expect(response.ok()).toBeTruthy();
      
      const routines = await response.json();
      expect(Array.isArray(routines)).toBe(true);
      expect(routines.length).toBeGreaterThan(0);
      
      // Verificar estructura
      const routine = routines[0];
      expect(routine).toHaveProperty('id');
      expect(routine).toHaveProperty('name');
    });

    test('GET /api/routines?name= returns routine with exercises', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/routines?name=Pecho%20%2F%20Espalda`);
      expect(response.ok()).toBeTruthy();
      
      const routine = await response.json();
      expect(routine).toHaveProperty('exercises');
      expect(Array.isArray(routine.exercises)).toBe(true);
    });

  });

  test.describe('Weight Service', () => {
    
    test('GET /api/weight returns weight history', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/weight`);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('POST /api/weight logs new weight', async ({ request }) => {
      const testWeight = 75.5;
      
      const response = await request.post(`${BASE_URL}/api/weight`, {
        data: { weight: testWeight }
      });
      expect(response.ok()).toBeTruthy();
      
      const result = await response.json();
      expect(result.weight).toBe(testWeight);
      
      // Cleanup: delete the test weight
      if (result.id) {
        await request.delete(`${BASE_URL}/api/weight?id=${result.id}`);
      }
    });

  });

  test.describe('Calendar Service', () => {
    
    test('GET /api/calendar returns calendar data', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/calendar`);
      expect(response.ok()).toBeTruthy();
      
      const calendar = await response.json();
      expect(typeof calendar).toBe('object');
    });

  });

  test.describe('Workouts Service', () => {
    
    test('GET /api/workouts returns workout history', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/workouts`);
      expect(response.ok()).toBeTruthy();
      
      const workouts = await response.json();
      expect(Array.isArray(workouts)).toBe(true);
    });

  });

  test.describe('Coach Service', () => {
    
    test('GET /api/coach/daily returns daily tip', async ({ request }) => {
      const response = await request.get(`${BASE_URL}/api/coach/daily`);
      expect(response.ok()).toBeTruthy();
      
      const tip = await response.json();
      expect(tip).toHaveProperty('message');
      expect(typeof tip.message).toBe('string');
    });

  });

});
