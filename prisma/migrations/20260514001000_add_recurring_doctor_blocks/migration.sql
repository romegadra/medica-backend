ALTER TABLE "DoctorBlockedTime"
ADD COLUMN "recurrenceType" TEXT NOT NULL DEFAULT 'date',
ADD COLUMN "dayOfWeek" INTEGER,
ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT;
