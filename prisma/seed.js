const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  // Clear existing data
  try {
    await prisma.workoutSet.deleteMany();
    await prisma.exerciseCatalog.deleteMany();
    await prisma.workoutSession.deleteMany();
    await prisma.dailyReport.deleteMany();
    await prisma.weeklyReport.deleteMany();
    await prisma.weightLog.deleteMany();
    await prisma.telegramMessage.deleteMany();
  } catch (e) {
    console.log('Cleanup skipped or failed', e.message);
  }

  // Seed sample weight logs
  const today = new Date();
  const weights = [82.5, 82.3, 82.0, 81.8, 81.5];
  for (let i = weights.length - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - (i * 3)); // Every 3 days
    await prisma.weightLog.create({
      data: {
        weight: weights[weights.length - 1 - i],
        date,
      }
    });
  }
  console.log(`Created ${weights.length} weight logs`);

  // No fake workout sessions — only real user data going forward
  console.log('No workout sessions seeded (only real data from user).');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
