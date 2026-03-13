-- CreateTable
CREATE TABLE "DailyReport" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramMessage" (
    "id" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "messageId" INTEGER NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeightLog" (
    "id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeightLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "muscleGroup" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "totalCalories" DOUBLE PRECISION,
    "didCardio" BOOLEAN NOT NULL DEFAULT false,
    "cardioType" TEXT,
    "cardioMinutes" INTEGER,
    "fatigueLevel" INTEGER,
    "nitRating" INTEGER,
    "feeling" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSet" (
    "id" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "exerciseName" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,

    CONSTRAINT "WorkoutSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyReport_date_key" ON "DailyReport"("date" ASC);

-- CreateIndex
CREATE INDEX "DailyReport_weekNumber_year_idx" ON "DailyReport"("weekNumber" ASC, "year" ASC);

-- CreateIndex
CREATE INDEX "TelegramMessage_chatId_idx" ON "TelegramMessage"("chatId" ASC);

-- CreateIndex
CREATE INDEX "TelegramMessage_sentAt_idx" ON "TelegramMessage"("sentAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_weekNumber_year_key" ON "WeeklyReport"("weekNumber" ASC, "year" ASC);

-- CreateIndex
CREATE INDEX "WorkoutSession_date_idx" ON "WorkoutSession"("date" ASC);

-- CreateIndex
CREATE INDEX "WorkoutSession_muscleGroup_idx" ON "WorkoutSession"("muscleGroup" ASC);

-- CreateIndex
CREATE INDEX "WorkoutSet_exerciseName_idx" ON "WorkoutSet"("exerciseName" ASC);

-- CreateIndex
CREATE INDEX "WorkoutSet_workoutSessionId_idx" ON "WorkoutSet"("workoutSessionId" ASC);

-- AddForeignKey
ALTER TABLE "WorkoutSet" ADD CONSTRAINT "WorkoutSet_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

