const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const exercisesByCategory = {
  "Pecho": [
    { name: "Press Inclinado con Mancuernas", muscleGroup: "Pecho" },
    { name: "Press de Banca Plano", muscleGroup: "Pecho" },
    { name: "Máquina de Aperturas/Pec Deck", muscleGroup: "Pecho" },
    { name: "Cruces en Polea Alta", muscleGroup: "Pecho" },
    { name: "Fondos en Paralelas", muscleGroup: "Pecho" },
    { name: "Press Declinado con Mancuernas", muscleGroup: "Pecho" },
    { name: "Flexiones (Push-ups)", muscleGroup: "Pecho" },
    { name: "Press de Pecho en Máquina", muscleGroup: "Pecho" },
    { name: "Press Svend", muscleGroup: "Pecho" },
    { name: "Aperturas con Mancuernas", muscleGroup: "Pecho" }
  ],
  "Espalda": [
    { name: "Jalón al Pecho", muscleGroup: "Espalda" },
    { name: "Remo con Barra", muscleGroup: "Espalda" },
    { name: "Remo Abierto en Máquina", muscleGroup: "Espalda" },
    { name: "Dominadas", muscleGroup: "Espalda" },
    { name: "Pullover con Mancuerna", muscleGroup: "Espalda" },
    { name: "Remo Gironda", muscleGroup: "Espalda" },
    { name: "Jalón al Pecho Agarre Neutro", muscleGroup: "Espalda" },
    { name: "Remo Kroc (Mancuerna)", muscleGroup: "Espalda" },
    { name: "Face Pulls", muscleGroup: "Espalda" },
    { name: "Remo T", muscleGroup: "Espalda" }
  ],
  "Pierna Cuádriceps": [
    { name: "Sentadilla Hack", muscleGroup: "Cuádriceps" },
    { name: "Prensa de Piernas", muscleGroup: "Cuádriceps" },
    { name: "Extensión de Cuádriceps", muscleGroup: "Cuádriceps" },
    { name: "Sentadilla Búlgara", muscleGroup: "Cuádriceps" },
    { name: "Sentadilla Goblet", muscleGroup: "Cuádriceps" },
    { name: "Zancadas Caminando", muscleGroup: "Cuádriceps" },
    { name: "Sentadilla Frontal", muscleGroup: "Cuádriceps" },
    { name: "Step-Ups", muscleGroup: "Cuádriceps" },
    { name: "Sentadilla Sissy", muscleGroup: "Cuádriceps" },
    { name: "Prensa Horizontal", muscleGroup: "Cuádriceps" }
  ],
  "Pierna Femoral": [
    { name: "Peso Muerto Rumano", muscleGroup: "Femoral" },
    { name: "Curl Femoral Sentado", muscleGroup: "Femoral" },
    { name: "Hip Thrust en Máquina", muscleGroup: "Glúteo" },
    { name: "Curl Femoral Acostado", muscleGroup: "Femoral" },
    { name: "Peso Muerto Convencional", muscleGroup: "Femoral" },
    { name: "Patada de Glúteo en Polea", muscleGroup: "Glúteo" },
    { name: "Abductores en Máquina", muscleGroup: "Glúteo" },
    { name: "Curl Nórdico", muscleGroup: "Femoral" },
    { name: "Buenos Días (Good Mornings)", muscleGroup: "Femoral" },
    { name: "Puente de Glúteo (Bridge)", muscleGroup: "Glúteo" }
  ],
  "Brazos": [
    { name: "Biserie: Press Francés + Curl Inclinado", muscleGroup: "Bíceps/Tríceps" },
    { name: "Biserie: Extensión Tríceps + Curl Martillo", muscleGroup: "Bíceps/Tríceps" },
    { name: "Elevaciones Laterales", muscleGroup: "Hombros" },
    { name: "Elevaciones Posteriores", muscleGroup: "Hombros" },
    { name: "Press Militar con Mancuernas", muscleGroup: "Hombros" },
    { name: "Curl con Barra Z", muscleGroup: "Bíceps" },
    { name: "Extensión de Tríceps en Polea (Cuerda)", muscleGroup: "Tríceps" },
    { name: "Curl Predicador", muscleGroup: "Bíceps" },
    { name: "Fondos entre Bancos", muscleGroup: "Tríceps" },
    { name: "Curl Araña", muscleGroup: "Bíceps" }
  ]
};

async function main() {
  console.log(`Start seeding ...`);

  // Clear existing (optional, but good for dev)
  try {
      await prisma.routineExercise.deleteMany();
      await prisma.routine.deleteMany();
      // We don't delete exercises to avoid losing history if we were in prod, but for dev it's ok.
      // await prisma.exercise.deleteMany();
  } catch(e) {
      console.log("Cleanup skipped or failed", e);
  }

  // 1. Create Exercises first
  const allExercises = {};
  for (const [category, exercises] of Object.entries(exercisesByCategory)) {
      for (const exData of exercises) {
          const exercise = await prisma.exercise.upsert({
              where: { name: exData.name },
              update: {},
              create: {
                  name: exData.name,
                  muscleGroup: exData.muscleGroup,
              }
          });
          allExercises[exData.name] = exercise.id;
      }
  }

  // 2. Define Routines and their content
  // We explicitly define "Pecho / Espalda" as a combination of Pecho and Espalda categories
  const routinesToCreate = {
      "Pecho / Espalda": [ ...exercisesByCategory["Pecho"], ...exercisesByCategory["Espalda"] ],
      "Pierna Cuádriceps": exercisesByCategory["Pierna Cuádriceps"],
      "Pierna Femoral": exercisesByCategory["Pierna Femoral"],
      "Brazos": exercisesByCategory["Brazos"]
  };

  // 3. Create Routines and Link Exercises
  for (const [routineName, exercises] of Object.entries(routinesToCreate)) {
    console.log(`Creating routine: ${routineName}`);
    
    // Create Routine
    const routine = await prisma.routine.create({
      data: {
        name: routineName,
        daysOfWeek: [], // Manual selection, so ignored
      }
    });

    // Link to Routine
    for (let i = 0; i < exercises.length; i++) {
      const exData = exercises[i];
      const exerciseId = allExercises[exData.name];
      
      if (exerciseId) {
          await prisma.routineExercise.create({
            data: {
                routineId: routine.id,
                exerciseId: exerciseId,
                order: i
            }
          });
      }
    }
  }

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
