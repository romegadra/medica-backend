ALTER TABLE "Appointment" ADD COLUMN "createdByReceptionistId" TEXT;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_createdByReceptionistId_fkey"
FOREIGN KEY ("createdByReceptionistId") REFERENCES "Receptionist"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
