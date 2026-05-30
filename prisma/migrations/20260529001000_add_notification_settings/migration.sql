ALTER TABLE "Doctor" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "AppSettings"
ADD COLUMN "appointmentRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "appointmentReminderIntervalMinutes" INTEGER NOT NULL DEFAULT 60;
