CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "role" TEXT,
  "unitId" TEXT,
  "doctorId" TEXT,
  "receptionistId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "summary" TEXT,
  "before" JSONB,
  "after" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditLog_unitId_createdAt_idx" ON "AuditLog"("unitId", "createdAt");
CREATE INDEX "AuditLog_doctorId_createdAt_idx" ON "AuditLog"("doctorId", "createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
