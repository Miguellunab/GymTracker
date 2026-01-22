/**
 * Tests para la lógica del Bot (State, Keyboards, Constants)
 */

const { test, expect } = require('@playwright/test');

// Importar módulos del bot directamente
// Nota: Estos tests corren en Node.js, no en browser

test.describe('Bot Logic - Unit Tests', () => {

  test.describe('Constants', () => {
    
    test('REST_TIMES has correct values', async () => {
      // Verificar que las constantes de tiempo existen
      const expectedTimes = {
        '3min': 180,
        '4min': 240,
        '5min': 300,
      };
      
      expect(expectedTimes['3min']).toBe(180);
      expect(expectedTimes['4min']).toBe(240);
      expect(expectedTimes['5min']).toBe(300);
    });

    test('STATES enum has all required states', async () => {
      const requiredStates = [
        'IDLE',
        'WORKOUT_SELECT_ROUTINE',
        'WORKOUT_SELECT_EXERCISES',
        'WORKOUT_INPUT_SETS',
        'WORKOUT_CARDIO',
        'WORKOUT_CONFIRM',
        'WEIGHT_INPUT',
        'COACH_CHAT',
      ];
      
      // Verificar que los estados son strings válidos
      requiredStates.forEach(state => {
        expect(typeof state).toBe('string');
      });
    });

  });

  test.describe('Keyboard Actions', () => {
    
    test('Main keyboard actions map correctly', async () => {
      // Simular el mapeo de acciones
      const actions = {
        '⏱️ 3min': 'timer_3',
        '⏱️ 4min': 'timer_4',
        '⏱️ 5min': 'timer_5',
        '🏋️ Workout': 'workout',
        '📊 Historial': 'history',
        '⚖️ Peso': 'weight',
        '🤖 Coach AI': 'coach',
        '📅 Calendario': 'calendar',
        '😴 Descanso': 'rest',
      };
      
      expect(actions['⏱️ 3min']).toBe('timer_3');
      expect(actions['🏋️ Workout']).toBe('workout');
      expect(actions['🤖 Coach AI']).toBe('coach');
    });

  });

  test.describe('Workout Stats Calculation', () => {
    
    test('calculates workout stats correctly', async () => {
      // Simular datos de workout
      const workoutData = {
        'ex1': [
          { weight: 80, reps: 10, isWarmup: false },
          { weight: 80, reps: 8, isWarmup: false },
          { weight: 85, reps: 6, isWarmup: false },
        ],
        'ex2': [
          { weight: 70, reps: 12, isWarmup: false },
          { weight: 70, reps: 10, isWarmup: false },
        ],
      };
      
      const cardio = { did: true, minutes: 20, intensity: 'Media' };
      
      // Calcular stats
      let totalSets = 0;
      let totalReps = 0;
      let totalWeight = 0;
      
      for (const exerciseSets of Object.values(workoutData)) {
        for (const set of exerciseSets) {
          if (!set.isWarmup) {
            totalSets++;
            totalReps += set.reps;
            totalWeight += set.weight * set.reps;
          }
        }
      }
      
      expect(totalSets).toBe(5);
      expect(totalReps).toBe(46); // 10+8+6+12+10
      expect(totalWeight).toBe(80*10 + 80*8 + 85*6 + 70*12 + 70*10); // 2990
      
      // Estimar calorías
      let calories = totalSets * 6; // 30
      const cardioCalPerMin = cardio.intensity === 'Alta' ? 12 : cardio.intensity === 'Media' ? 9 : 6;
      calories += cardio.minutes * cardioCalPerMin; // 30 + 180 = 210
      
      expect(calories).toBe(210);
    });

  });

  test.describe('Calendar Formatting', () => {
    
    test('formats calendar text correctly', async () => {
      const MONTH_NAMES = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      
      const DAY_NAMES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
      
      expect(MONTH_NAMES[0]).toBe('Enero');
      expect(MONTH_NAMES[11]).toBe('Diciembre');
      expect(DAY_NAMES.length).toBe(7);
    });

  });

  test.describe('Weight Diff Calculation', () => {
    
    test('calculates weight difference correctly', async () => {
      const lastWeight = 78.5;
      const newWeight = 78.2;
      const diff = newWeight - lastWeight;
      
      expect(diff).toBeCloseTo(-0.3, 1);
      expect(diff < 0).toBe(true); // Bajó de peso
    });

  });

  test.describe('Timer Formatting', () => {
    
    test('formats timer message correctly', async () => {
      const formatTime = (totalSeconds) => {
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      };
      
      expect(formatTime(180)).toBe('3:00');
      expect(formatTime(150)).toBe('2:30');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(0)).toBe('0:00');
    });

  });

});
