const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const routinesData = {
  "Pecho / Espalda": [
    { name: "Press Inclinado con Mancuernas", muscleGroup: "Pecho" },
    { name: "Jalón al Pecho", muscleGroup: "Espalda" },
    { name: "Máquina de Aperturas/Pec Deck", muscleGroup: "Pecho" },
    { name: "Remo Abierto en Máquina", muscleGroup: "Espalda" },
  ],
  "Pierna Cuádriceps": [
    { name: "Sentadilla Hack", muscleGroup: "Cuádriceps" },
    { name: "Prensa de Piernas", muscleGroup: "Cuádriceps" },
    { name: "Extensión de Cuádriceps", muscleGroup: "Cuádriceps" },
    { name: "Sentadilla Búlgara", muscleGroup: "Cuádriceps" },
  ],
  "Pierna Femoral": [
    { name: "Peso Muerto Rumano", muscleGroup: "Femoral" },
    { name: "Curl Femoral Sentado", muscleGroup: "Femoral" },
    { name: "Hip Thrust en Máquina", muscleGroup: "Glúteo" },
    { name: "Curl Femoral Acostado", muscleGroup: "Femoral" }
  ],
  "Brazos": [
    { name: "Biserie: Press Francés + Curl Inclinado", muscleGroup: "Bíceps/Tríceps" },
    { name: "Biserie: Extensión Tríceps + Curl Martillo", muscleGroup: "Bíceps/Tríceps" },
    { name: "Elevaciones Laterales", muscleGroup: "Hombros" },
    { name: "Elevaciones Posteriores", muscleGroup: "Hombros" },
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

  for (const [routineName, exercises] of Object.entries(routinesData)) {
    console.log(`Creating routine: ${routineName}`);
    
    // Create Routine
    const routine = await prisma.routine.create({
      data: {
        name: routineName,
        daysOfWeek: [], // Manual selection, so ignored
      }
    });

    // Create Exercises and Link
    for (let i = 0; i < exercises.length; i++) {
      const exData = exercises[i];
      
      // Upsert Exercise
      const exercise = await prisma.exercise.upsert({
        where: { name: exData.name },
        update: {},
        create: {
          name: exData.name,
          muscleGroup: exData.muscleGroup,
        }
      });

      // Link to Routine
      await prisma.routineExercise.create({
        data: {
            routineId: routine.id,
            exerciseId: exercise.id,
            order: i
        }
      });
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
