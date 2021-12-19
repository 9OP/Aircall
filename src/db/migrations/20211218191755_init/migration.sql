-- CreateTable
CREATE TABLE "incidents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "escalation" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    CONSTRAINT "incidents_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "healthy" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "policies" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "policies_levels" (
    "escalation" INTEGER NOT NULL,
    "policyId" INTEGER NOT NULL,
    "levelId" INTEGER NOT NULL,

    PRIMARY KEY ("policyId", "levelId"),
    CONSTRAINT "policies_levels_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "policies_levels_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "levels" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "levels" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "targets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type" INTEGER NOT NULL,
    "contact" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_PolicyToService" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "policies" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "services" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_LevelToTarget" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "levels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "targets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "policies_levels_policyId_levelId_escalation_key" ON "policies_levels"("policyId", "levelId", "escalation");

-- CreateIndex
CREATE UNIQUE INDEX "_PolicyToService_AB_unique" ON "_PolicyToService"("A", "B");

-- CreateIndex
CREATE INDEX "_PolicyToService_B_index" ON "_PolicyToService"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_LevelToTarget_AB_unique" ON "_LevelToTarget"("A", "B");

-- CreateIndex
CREATE INDEX "_LevelToTarget_B_index" ON "_LevelToTarget"("B");
