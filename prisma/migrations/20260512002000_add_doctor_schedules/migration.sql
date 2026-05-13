CREATE TABLE "DoctorSchedule" (
  "id" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "DoctorSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DoctorSchedule_doctorId_dayOfWeek_idx" ON "DoctorSchedule"("doctorId", "dayOfWeek");

ALTER TABLE "DoctorSchedule"
ADD CONSTRAINT "DoctorSchedule_doctorId_fkey"
FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
