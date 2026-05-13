CREATE TABLE "AppSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "startHour" INTEGER NOT NULL DEFAULT 8,
    "endHour" INTEGER NOT NULL DEFAULT 20,
    "slotMinutes" INTEGER NOT NULL DEFAULT 30,
    "allowOverlap" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "AppSettings" ("id", "startHour", "endHour", "slotMinutes", "allowOverlap", "updatedAt")
VALUES ('default', 8, 20, 30, false, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
