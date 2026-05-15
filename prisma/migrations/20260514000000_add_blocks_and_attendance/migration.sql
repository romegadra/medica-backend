CREATE TABLE "DoctorBlockedTime" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorBlockedTime_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Appointment" ADD COLUMN "attended" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "DoctorBlockedTime" ADD CONSTRAINT "DoctorBlockedTime_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
