ALTER TABLE "Appointment" ADD COLUMN "createdByDoctorId" TEXT;

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_createdByDoctorId_fkey"
FOREIGN KEY ("createdByDoctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
