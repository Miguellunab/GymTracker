const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const exercises = [
    // Push
    { name: 'Press de Banca', category: 'Push' },
    { name: 'Press Inclinado con Mancuernas', category: 'Push' },
    { name: 'Fondos', category: 'Push' },
    { name: 'Aperturas con Mancuernas', category: 'Push' },
    { name: 'Press Militar', category: 'Push' },
    { name: 'Elevaciones Laterales', category: 'Push' },
    { name: 'Extensiones de Tríceps', category: 'Push' },
    { name: 'Flexiones', category: 'Push' },

    // Pull
    { name: 'Dominadas', category: 'Pull' },
    { name: 'Remo con Barra', category: 'Pull' },
    { name: 'Jalón al Pecho', category: 'Pull' },
    { name: 'Remo en Polea Baja', category: 'Pull' },
    { name: 'Face Pulls', category: 'Pull' },
    { name: 'Curl de Bíceps', category: 'Pull' },
    { name: 'Curl Martillo', category: 'Pull' },
    { name: 'Encogimientos de Hombros', category: 'Pull' },

    // Legs
    { name: 'Sentadillas', category: 'Legs' },
    { name: 'Peso Muerto', category: 'Legs' },
    { name: 'Prensa', category: 'Legs' },
    { name: 'Zancadas', category: 'Legs' },
    { name: 'Extensiones de Cuádriceps', category: 'Legs' },
    { name: 'Curl Femoral', category: 'Legs' },
    { name: 'Elevación de Talones', category: 'Legs' },

    // Core
    { name: 'Plancha', category: 'Core' },
    { name: 'Crunches', category: 'Core' },
    { name: 'Elevaciones de Piernas', category: 'Core' },
    { name. 'Leñador', category: 'Core'},

    // Cardio
    { name: 'Correr', category: 'Cardio' },
    { name: 'Bicicleta', category: 'Cardio' },
    { name: 'Elíptica', category: 'Cardio' },
    { name: 'Saltar la Cuerda', category: 'Cardio' },
];

async function main() {
    console.log(`Start seeding ...`);
    for (const exercise of exercises) {
        const result = await prisma.exercise.create({
            data: exercise,
        });
        console.log(`Created exercise with id: ${result.id}`);
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
