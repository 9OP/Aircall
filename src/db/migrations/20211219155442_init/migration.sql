-- CreateTable
CREATE TABLE "incidents" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "escalation" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 0,
    "serviceId" INTEGER NOT NULL,
    "targetId" INTEGER,
    CONSTRAINT "incidents_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "incidents_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "targets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "services" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "healthy" BOOLEAN NOT NULL DEFAULT true,
    "policyId" INTEGER NOT NULL,
    CONSTRAINT "services_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "policies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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

    PRIMARY KEY ("policyId", "escalation"),
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
CREATE TABLE "_LevelToTarget" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    FOREIGN KEY ("A") REFERENCES "levels" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY ("B") REFERENCES "targets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE INDEX "services_name_idx" ON "services"("name");

-- CreateIndex
CREATE UNIQUE INDEX "policies_name_key" ON "policies"("name");

-- CreateIndex
CREATE INDEX "policies_name_idx" ON "policies"("name");

-- CreateIndex
CREATE UNIQUE INDEX "levels_name_key" ON "levels"("name");

-- CreateIndex
CREATE INDEX "levels_name_idx" ON "levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "targets_type_contact_key" ON "targets"("type", "contact");

-- CreateIndex
CREATE UNIQUE INDEX "_LevelToTarget_AB_unique" ON "_LevelToTarget"("A", "B");

-- CreateIndex
CREATE INDEX "_LevelToTarget_B_index" ON "_LevelToTarget"("B");
