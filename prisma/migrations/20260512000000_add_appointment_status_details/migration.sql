ALTER TABLE "Appointment"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'scheduled',
ADD COLUMN "notes" TEXT,
ADD COLUMN "paymentType" TEXT,
ADD COLUMN "cancellationReason" TEXT,
ADD COLUMN "cancelledAt" TIMESTAMP(3);
