import prismaClient from './prisma.js';

const BASE_EXERCISES = [
  {
    canonicalName: 'Press de banca con barra',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'barra',
    aliases: ['press banca barra', 'bench press barra', 'barbell bench press'],
  },
  {
    canonicalName: 'Press de banca con mancuernas',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'mancuernas',
    aliases: ['press banca mancuernas', 'bench press mancuernas', 'dumbbell bench press'],
  },
  {
    canonicalName: 'Press inclinado con barra',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'barra',
    aliases: ['press inclinado barra', 'inclinado barra'],
  },
  {
    canonicalName: 'Press inclinado con mancuernas',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'mancuernas',
    aliases: ['press inclinado mancuernas', 'inclinado mancuernas'],
  },
  {
    canonicalName: 'Jalon al pecho en polea',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'polea',
    aliases: ['jalon al pecho', 'jalon', 'jalones', 'lat pulldown', 'jalon polea'],
  },
  {
    canonicalName: 'Remo con barra',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'barra',
    aliases: ['remo barra', 'barbell row', 'remo'],
  },
  {
    canonicalName: 'Remo con mancuernas',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'mancuernas',
    aliases: ['remo mancuerna', 'remo mancuernas', 'dumbbell row'],
  },
  {
    canonicalName: 'Peso muerto convencional',
    muscleGroup: 'Pierna',
    equipment: 'barra',
    aliases: ['peso muerto', 'deadlift', 'peso muerto convencional'],
  },
  {
    canonicalName: 'Sentadilla con barra',
    muscleGroup: 'Pierna',
    equipment: 'barra',
    aliases: ['sentadilla', 'sentadilla libre', 'back squat'],
  },
  {
    canonicalName: 'Hack squat en maquina',
    muscleGroup: 'Pierna',
    equipment: 'maquina',
    aliases: ['hack squat', 'sentadilla hacka', 'hacka', 'hack'],
  },
  {
    canonicalName: 'Prensa de pierna en maquina',
    muscleGroup: 'Pierna',
    equipment: 'maquina',
    aliases: ['prensa', 'prensa de pierna', 'leg press'],
  },
  {
    canonicalName: 'Curl femoral en maquina',
    muscleGroup: 'Pierna',
    equipment: 'maquina',
    aliases: ['curl femoral', 'femoral acostado', 'leg curl'],
  },
  {
    canonicalName: 'Extension de cuadriceps en maquina',
    muscleGroup: 'Pierna',
    equipment: 'maquina',
    aliases: ['extension cuadriceps', 'extensiones', 'leg extension'],
  },
  {
    canonicalName: 'Curl de biceps con barra',
    muscleGroup: 'Brazos',
    equipment: 'barra',
    aliases: ['curl barra', 'barbell curl'],
  },
  {
    canonicalName: 'Curl de biceps con mancuernas',
    muscleGroup: 'Brazos',
    equipment: 'mancuernas',
    aliases: ['curl mancuerna', 'curl mancuernas', 'dumbbell curl'],
  },
  {
    canonicalName: 'Extension de triceps en polea',
    muscleGroup: 'Brazos',
    equipment: 'polea',
    aliases: ['extension tricep', 'jalon tricep', 'tricep pushdown', 'triceps polea'],
  },
  {
    canonicalName: 'Press frances con barra',
    muscleGroup: 'Brazos',
    equipment: 'barra',
    aliases: ['press frances', 'skull crusher'],
  },
  {
    canonicalName: 'Elevaciones laterales con mancuernas',
    muscleGroup: 'Brazos',
    equipment: 'mancuernas',
    aliases: ['laterales', 'elevaciones laterales'],
  },
  {
    canonicalName: 'Fondos en paralelas',
    muscleGroup: 'Brazos',
    equipment: 'peso corporal',
    aliases: ['fondos', 'dips'],
  },
  {
    canonicalName: 'Dominadas',
    muscleGroup: 'Pecho/Espalda',
    equipment: 'peso corporal',
    aliases: ['dominadas', 'pull ups'],
  },
];

const AMBIGUOUS_EXERCISES = [
  {
    key: 'press-banca',
    question: 'Cuando dices press banca, fue con barra o con mancuernas?',
    matchers: ['press banca', 'banca'],
    options: ['Press de banca con barra', 'Press de banca con mancuernas'],
  },
  {
    key: 'press-inclinado',
    question: 'Cuando dices press inclinado, fue con barra o con mancuernas?',
    matchers: ['press inclinado', 'inclinado'],
    options: ['Press inclinado con barra', 'Press inclinado con mancuernas'],
  },
  {
    key: 'curl-biceps',
    question: 'Cuando dices curl de biceps, fue con barra o con mancuernas?',
    matchers: ['curl', 'curl biceps', 'curl de biceps'],
    options: ['Curl de biceps con barra', 'Curl de biceps con mancuernas'],
  },
  {
    key: 'remo',
    question: 'Cuando dices remo, fue con barra o con mancuernas?',
    matchers: ['remo'],
    options: ['Remo con barra', 'Remo con mancuernas'],
  },
];

const EQUIPMENT_HINTS = [
  { equipment: 'barra', matchers: [' barra', 'barbell', 'olimpica', 'smith'] },
  { equipment: 'mancuernas', matchers: ['mancuerna', 'mancuernas', 'dumbbell'] },
  { equipment: 'maquina', matchers: ['maquina', 'máquina', 'hack', 'hacka', 'prensa'] },
  { equipment: 'polea', matchers: ['polea', 'jalon', 'jalón', 'cable'] },
];

let ensureCatalogPromise = null;

export function normalizeExerciseText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function slugifyExercise(value = '') {
  return normalizeExerciseText(value).replace(/\s+/g, '-');
}

function titleCaseExercise(value = '') {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getCatalogSeed() {
  return BASE_EXERCISES.map((exercise) => ({
    ...exercise,
    slug: slugifyExercise(exercise.canonicalName),
    aliases: Array.from(
      new Set(
        [exercise.canonicalName, ...(exercise.aliases || [])]
          .map((alias) => normalizeExerciseText(alias))
          .filter(Boolean)
      )
    ),
  }));
}

async function upsertCatalogSeed(prisma) {
  for (const exercise of getCatalogSeed()) {
    await prisma.exerciseCatalog.upsert({
      where: { slug: exercise.slug },
      update: {
        canonicalName: exercise.canonicalName,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        aliases: exercise.aliases,
        isActive: true,
      },
      create: {
        canonicalName: exercise.canonicalName,
        slug: exercise.slug,
        muscleGroup: exercise.muscleGroup,
        equipment: exercise.equipment,
        aliases: exercise.aliases,
        isAmbiguous: false,
      },
    });
  }
}

async function backfillLegacySets(prisma) {
  const legacySets = await prisma.workoutSet.findMany({
    where: { exerciseId: null },
    select: { id: true, exerciseName: true, originalInput: true },
  });

  for (const set of legacySets) {
    const rawInput = set.originalInput || set.exerciseName;
    const resolution = await resolveExerciseInput(prisma, rawInput, { allowCreateCustom: true, skipEnsure: true });
    if (resolution.status !== 'resolved') continue;

    await prisma.workoutSet.update({
      where: { id: set.id },
      data: {
        exerciseId: resolution.exerciseId,
        exerciseName: resolution.canonicalName,
        originalInput: rawInput,
      },
    });
  }
}

export async function ensureExerciseCatalog(prisma = prismaClient) {
  if (!ensureCatalogPromise) {
    ensureCatalogPromise = (async () => {
      await upsertCatalogSeed(prisma);
      await backfillLegacySets(prisma);
    })().catch((error) => {
      ensureCatalogPromise = null;
      throw error;
    });
  }

  return ensureCatalogPromise;
}

function detectEquipment(cleaned) {
  for (const hint of EQUIPMENT_HINTS) {
    if (hint.matchers.some((matcher) => cleaned.includes(normalizeExerciseText(matcher)))) {
      return hint.equipment;
    }
  }
  return null;
}

async function getCatalogMap(prisma, options = {}) {
  if (!options.skipEnsure) {
    await ensureExerciseCatalog(prisma);
  }
  const catalog = await prisma.exerciseCatalog.findMany({ where: { isActive: true } });
  const bySlug = new Map();
  const byCanonical = new Map();

  for (const item of catalog) {
    bySlug.set(item.slug, item);
    byCanonical.set(normalizeExerciseText(item.canonicalName), item);
    for (const alias of item.aliases || []) {
      byCanonical.set(normalizeExerciseText(alias), item);
    }
  }

  return { catalog, bySlug, byCanonical };
}

async function createCustomExercise(prisma, rawInput) {
  const cleaned = normalizeExerciseText(rawInput);
  const canonicalName = titleCaseExercise(cleaned || rawInput.trim());
  const baseSlug = slugifyExercise(canonicalName || rawInput);
  let slug = baseSlug || `ejercicio-${Date.now()}`;
  let suffix = 1;

  while (await prisma.exerciseCatalog.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  return prisma.exerciseCatalog.create({
    data: {
      canonicalName,
      slug,
      aliases: cleaned ? [cleaned] : [],
      isAmbiguous: false,
    },
  });
}

function findAmbiguity(cleanedInput) {
  for (const ambiguity of AMBIGUOUS_EXERCISES) {
    if (ambiguity.matchers.some((matcher) => cleanedInput === normalizeExerciseText(matcher) || cleanedInput.includes(normalizeExerciseText(matcher)))) {
      return ambiguity;
    }
  }
  return null;
}

export async function resolveExerciseInput(
  prisma = prismaClient,
  rawInput,
  options = {}
) {
  const { allowCreateCustom = true, skipEnsure = false } = options;
  const cleanedInput = normalizeExerciseText(rawInput || '');

  if (!cleanedInput) {
    return { status: 'empty', input: rawInput };
  }

  if (!skipEnsure) {
    await ensureExerciseCatalog(prisma);
  }

  const { catalog, byCanonical } = await getCatalogMap(prisma, { skipEnsure });
  const directMatch = byCanonical.get(cleanedInput);
  if (directMatch) {
    return {
      status: 'resolved',
      input: rawInput,
      canonicalName: directMatch.canonicalName,
      exerciseId: directMatch.id,
      slug: directMatch.slug,
      muscleGroup: directMatch.muscleGroup,
      equipment: directMatch.equipment,
      originalInput: rawInput,
    };
  }

  const ambiguity = findAmbiguity(cleanedInput);
  const explicitEquipment = detectEquipment(` ${cleanedInput} `);
  if (ambiguity) {
    const ambiguityOptions = ambiguity.options
      .map((canonicalName) => catalog.find((item) => item.canonicalName === canonicalName))
      .filter(Boolean);

    if (explicitEquipment) {
      const explicitMatch = ambiguityOptions.find((item) => item.equipment === explicitEquipment);
      if (explicitMatch) {
        return {
          status: 'resolved',
          input: rawInput,
          canonicalName: explicitMatch.canonicalName,
          exerciseId: explicitMatch.id,
          slug: explicitMatch.slug,
          muscleGroup: explicitMatch.muscleGroup,
          equipment: explicitMatch.equipment,
          originalInput: rawInput,
        };
      }
    }

    return {
      status: 'ambiguous',
      input: rawInput,
      question: ambiguity.question,
      options: ambiguityOptions.map((item) => ({
        id: item.id,
        canonicalName: item.canonicalName,
        equipment: item.equipment,
        slug: item.slug,
      })),
    };
  }

  const partialMatch = catalog.find((item) => {
    const normalizedCanonical = normalizeExerciseText(item.canonicalName);
    return normalizedCanonical.includes(cleanedInput) || cleanedInput.includes(normalizedCanonical) || (item.aliases || []).some((alias) => cleanedInput.includes(alias));
  });

  if (partialMatch) {
    return {
      status: 'resolved',
      input: rawInput,
      canonicalName: partialMatch.canonicalName,
      exerciseId: partialMatch.id,
      slug: partialMatch.slug,
      muscleGroup: partialMatch.muscleGroup,
      equipment: partialMatch.equipment,
      originalInput: rawInput,
    };
  }

  if (!allowCreateCustom) {
    return { status: 'unknown', input: rawInput };
  }

  const customExercise = await createCustomExercise(prisma, rawInput);
  return {
    status: 'resolved',
    input: rawInput,
    canonicalName: customExercise.canonicalName,
    exerciseId: customExercise.id,
    slug: customExercise.slug,
    muscleGroup: customExercise.muscleGroup,
    equipment: customExercise.equipment,
    originalInput: rawInput,
    isCustom: true,
  };
}

export async function resolveExerciseEntries(prisma = prismaClient, exercises = [], options = {}) {
  const resolutions = [];
  for (const exercise of exercises) {
    const name = typeof exercise === 'string' ? exercise : exercise.name || exercise.exerciseName;
    const resolution = await resolveExerciseInput(prisma, name, options);
    resolutions.push({
      ...resolution,
      original: name,
    });
  }
  return resolutions;
}

export async function getExerciseSuggestions(prisma = prismaClient, query = '', limit = 8) {
  await ensureExerciseCatalog(prisma);
  const cleanedQuery = normalizeExerciseText(query);
  const catalog = await prisma.exerciseCatalog.findMany({
    where: { isActive: true },
    orderBy: [{ updatedAt: 'desc' }, { canonicalName: 'asc' }],
    take: 100,
  });

  const ranked = catalog.filter((item) => {
    if (!cleanedQuery) return true;
    const canonical = normalizeExerciseText(item.canonicalName);
    return canonical.includes(cleanedQuery) || (item.aliases || []).some((alias) => alias.includes(cleanedQuery));
  });

  return ranked.slice(0, limit).map((item) => ({
    id: item.id,
    canonicalName: item.canonicalName,
    equipment: item.equipment,
    muscleGroup: item.muscleGroup,
    slug: item.slug,
  }));
}

export async function getExerciseSnapshot(prisma = prismaClient, query) {
  const resolution = await resolveExerciseInput(prisma, query, { allowCreateCustom: false });

  if (resolution.status === 'ambiguous') {
    return resolution;
  }

  if (resolution.status !== 'resolved') {
    return null;
  }

  const sessions = await prisma.workoutSession.findMany({
    include: {
      sets: true,
    },
    orderBy: { date: 'desc' },
    take: 80,
  });

  const entries = sessions.flatMap((session) =>
    session.sets
      .filter((set) => set.exerciseId === resolution.exerciseId || normalizeExerciseText(set.exerciseName) === normalizeExerciseText(resolution.canonicalName))
      .map((set) => ({
        date: session.date,
        muscleGroup: session.muscleGroup,
        weight: set.weight,
        reps: set.reps,
        sets: set.sets,
      }))
  );

  if (entries.length === 0) {
    return {
      ...resolution,
      lastEntry: null,
      bestEntry: null,
      totalEntries: 0,
    };
  }

  const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  const bestEntry = [...entries].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (b.reps !== a.reps) return b.reps - a.reps;
    return b.sets - a.sets;
  })[0];

  return {
    ...resolution,
    lastEntry: sortedEntries[0],
    bestEntry,
    totalEntries: entries.length,
    recentEntries: sortedEntries.slice(0, 3),
  };
}

export async function getRelevantExerciseContext(prisma = prismaClient, userText = '') {
  const cleaned = normalizeExerciseText(userText);
  if (!cleaned) return '';

  const queries = [
    ...AMBIGUOUS_EXERCISES.flatMap((item) => item.matchers),
    ...BASE_EXERCISES.flatMap((item) => [item.canonicalName, ...(item.aliases || [])]),
  ]
    .map((item) => normalizeExerciseText(item))
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  const matchedQuery = queries.find((item) => cleaned.includes(item));
  if (!matchedQuery) return '';

  const snapshot = await getExerciseSnapshot(prisma, matchedQuery);
  if (!snapshot) return '';
  if (snapshot.status === 'ambiguous') {
    return `Ejercicio consultado es ambiguo. Opciones probables: ${snapshot.options.map((option) => option.canonicalName).join(', ')}.`;
  }

  if (!snapshot.lastEntry) {
    return `No hay registros previos para ${snapshot.canonicalName}.`;
  }

  const lastDate = new Date(snapshot.lastEntry.date).toISOString().slice(0, 10);
  const bestDate = new Date(snapshot.bestEntry.date).toISOString().slice(0, 10);

  return [
    `Estadisticas de ${snapshot.canonicalName}:`,
    `- Ultimo registro: ${lastDate}, ${snapshot.lastEntry.weight}kg, ${snapshot.lastEntry.sets}x${snapshot.lastEntry.reps}.`,
    `- Mejor registro: ${snapshot.bestEntry.weight}kg, ${snapshot.bestEntry.sets}x${snapshot.bestEntry.reps} el ${bestDate}.`,
    `- Total de registros encontrados: ${snapshot.totalEntries}.`,
  ].join('\n');
}

export async function getReminderWeightContext(prisma = prismaClient, limit = 3) {
  await ensureExerciseCatalog(prisma);
  const sessions = await prisma.workoutSession.findMany({
    include: { sets: true },
    orderBy: { date: 'desc' },
    take: 6,
  });

  const seen = new Set();
  const reminders = [];

  for (const session of sessions) {
    for (const set of session.sets) {
      const key = set.exerciseId || normalizeExerciseText(set.exerciseName);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      reminders.push(`${set.exerciseName}: ${set.weight}kg ${set.sets}x${set.reps}`);
      if (reminders.length >= limit) {
        return reminders;
      }
    }
  }

  return reminders;
}

export { AMBIGUOUS_EXERCISES, BASE_EXERCISES };
