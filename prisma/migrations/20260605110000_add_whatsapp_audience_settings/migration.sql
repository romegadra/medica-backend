ALTER TABLE "AppSettings"
ADD COLUMN "whatsappPatientNotificationsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsappDoctorNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
