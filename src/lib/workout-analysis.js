function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function countMatches(text, patterns) {
  return patterns.reduce((total, pattern) => total + (text.includes(pattern) ? 1 : 0), 0);
}

function estimateCardioKcalPerMinute(cardioType = '') {
  const text = normalizeText(cardioType);

  if (text.includes('cuerda')) return 10;
  if (text.includes('escaladora')) return 9;
  if (text.includes('trote')) return 8.5;
  if (text.includes('spinning')) return 8;
  if (text.includes('bicic')) return 7.5;
  if (text.includes('elipt')) return 7;
  if (text.includes('caminadora')) return 6.5;
  if (text.includes('caminata')) return 5.5;

  return 6.5;
}

function estimateStrengthKcalPerMinute(feeling = '', exercises = []) {
  const text = normalizeText(feeling);
  const averageReps = exercises.length > 0
    ? exercises.reduce((sum, exercise) => sum + (Number(exercise.reps) || 0), 0) / exercises.length
    : 10;

  let kcalPerMinute = averageReps >= 12 ? 5.25 : 5.75;

  kcalPerMinute += countMatches(text, ['fallo', 'pesado', 'duro', 'revente', 'fuerte']) * 0.35;
  kcalPerMinute -= countMatches(text, ['suave', 'ligero', 'facil']) * 0.25;

  return clamp(kcalPerMinute, 4.5, 7.5);
}

function estimateRirScore(feeling = '', exercises = [], didCardio = false) {
  const text = normalizeText(feeling);
  let score = 3;

  score -= countMatches(text, ['fallo', 'al limite', 'pesado', 'duro']) * 0.9;
  score -= countMatches(text, ['fuerte', 'con fuerza', 'rompi marcas']) * 0.4;
  score += countMatches(text, ['suave', 'ligero', 'facil']) * 0.8;
  score += countMatches(text, ['sin fuerza']) * 0.4;

  if (didCardio && exercises.length === 0) {
    score += 1;
  }

  return Math.round(clamp(score, 0, 5));
}

function estimateFatigueLevel({ feeling = '', durationMinutes = 0, exercises = [], didCardio = false, cardioMinutes = 0 }) {
  const text = normalizeText(feeling);
  let fatigue = 3;

  fatigue += Math.min(3, (Number(durationMinutes) || 0) / 40);
  fatigue += Math.min(2, exercises.length / 3);
  fatigue += Math.min(2, (Number(cardioMinutes) || 0) / 25);
  fatigue += countMatches(text, ['fallo', 'reventado', 'agotado', 'duro']) * 0.8;
  fatigue += countMatches(text, ['fuerte', 'pump']) * 0.4;
  fatigue -= countMatches(text, ['suave', 'ligero', 'facil']) * 0.6;

  if (didCardio && exercises.length === 0) {
    fatigue -= 0.5;
  }

  return Math.round(clamp(fatigue, 1, 10));
}

function buildAnalysis({ didCardio, exercises, cardioType, cardioMinutes, fatigueLevel, rirScore, totalCalories }) {
  if (exercises.length === 0 && didCardio) {
    return `Buen descanso activo: ${cardioType || 'cardio'} durante ${cardioMinutes || 0} min. El gasto queda cerca de ${totalCalories} kcal con una fatiga controlada de ${fatigueLevel}/10 y RIR global ${rirScore}.`;
  }

  if (exercises.length === 0) {
    return 'Dia de descanso total. No hay carga de entrenamiento y la fatiga estimada se mantiene baja para favorecer la recuperacion.';
  }

  const effortText = rirScore <= 1
    ? 'muy cerca del fallo'
    : rirScore <= 3
      ? 'con esfuerzo solido pero controlado'
      : 'dejando bastante margen en reserva';

  return `Sesion estimada en ${totalCalories} kcal, ${effortText}. La fatiga global queda en ${fatigueLevel}/10 y el RIR de la sesion en ${rirScore}, ponderando todo el entrenamiento y no solo una sensacion aislada.`;
}

export function estimateWorkoutAnalysis({
  muscleGroup,
  exercises = [],
  cardio = null,
  feeling = '',
  durationMinutes = null,
  userWeight = 75,
}) {
  const safeExercises = Array.isArray(exercises) ? exercises : [];
  const didCardio = !!cardio;
  const cardioMinutes = Number(cardio?.minutes) || 0;
  const cardioType = cardio?.type || '';

  const totalDuration = Number(durationMinutes) || (didCardio ? cardioMinutes : 0);
  const strengthMinutes = Math.max(0, totalDuration - cardioMinutes);

  const strengthKcalPerMinute = estimateStrengthKcalPerMinute(feeling, safeExercises);
  const cardioKcalPerMinute = estimateCardioKcalPerMinute(cardioType);

  const strengthCalories = strengthMinutes * strengthKcalPerMinute;
  const cardioCalories = cardioMinutes * cardioKcalPerMinute;
  const bodyWeightFactor = clamp(userWeight / 75, 0.85, 1.25);

  const totalCalories = Math.round((strengthCalories + cardioCalories) * bodyWeightFactor);
  const rirScore = estimateRirScore(feeling, safeExercises, didCardio);
  const fatigueLevel = estimateFatigueLevel({
    feeling,
    durationMinutes: totalDuration,
    exercises: safeExercises,
    didCardio,
    cardioMinutes,
  });

  return {
    totalCalories,
    rirScore,
    fatigueLevel,
    analysis: buildAnalysis({
      didCardio,
      exercises: safeExercises,
      cardioType,
      cardioMinutes,
      fatigueLevel,
      rirScore,
      totalCalories,
      muscleGroup,
    }),
    normalizedExercises: safeExercises.map((exercise) => ({
      original: exercise.original || exercise.name,
      normalized: exercise.name,
    })),
    source: 'fallback',
  };
}
