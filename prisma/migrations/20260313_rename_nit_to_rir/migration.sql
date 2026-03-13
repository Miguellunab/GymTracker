ALTER TABLE "WorkoutSession"
ADD COLUMN "rirScore" INTEGER;

UPDATE "WorkoutSession"
SET "rirScore" = CASE
  WHEN "nitRating" IS NULL THEN NULL
  ELSE GREATEST(0, LEAST(5, ROUND((10 - "nitRating") / 2.0)))
END;

ALTER TABLE "WorkoutSession"
DROP COLUMN "nitRating";
