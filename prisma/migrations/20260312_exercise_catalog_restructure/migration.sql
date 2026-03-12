-- Create exercise catalog
CREATE TABLE "ExerciseCatalog" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "muscleGroup" TEXT,
    "equipment" TEXT,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAmbiguous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExerciseCatalog_pkey" PRIMARY KEY ("id")
);

-- Alter workout sets to reference catalog
ALTER TABLE "WorkoutSet"
ADD COLUMN     "exerciseId" TEXT,
ADD COLUMN     "originalInput" TEXT;

-- Indexes
CREATE UNIQUE INDEX "ExerciseCatalog_canonicalName_key" ON "ExerciseCatalog"("canonicalName");
CREATE UNIQUE INDEX "ExerciseCatalog_slug_key" ON "ExerciseCatalog"("slug");
CREATE INDEX "ExerciseCatalog_muscleGroup_idx" ON "ExerciseCatalog"("muscleGroup");
CREATE INDEX "ExerciseCatalog_slug_idx" ON "ExerciseCatalog"("slug");
CREATE INDEX "WorkoutSet_exerciseId_idx" ON "WorkoutSet"("exerciseId");

-- Foreign key
ALTER TABLE "WorkoutSet"
ADD CONSTRAINT "WorkoutSet_exerciseId_fkey"
FOREIGN KEY ("exerciseId") REFERENCES "ExerciseCatalog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
