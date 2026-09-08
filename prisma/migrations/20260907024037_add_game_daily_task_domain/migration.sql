-- CreateEnum
CREATE TYPE "TaskCadence" AS ENUM ('DAILY');

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(3),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(3);

-- CreateTable
CREATE TABLE "games" (
    "id" UUID NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_accounts" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "game_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_definitions" (
    "id" UUID NOT NULL,
    "gameId" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "targetValue" INTEGER NOT NULL DEFAULT 1,
    "targetUnit" VARCHAR(50) NOT NULL DEFAULT 'COMPLETION',
    "cadence" "TaskCadence" NOT NULL DEFAULT 'DAILY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "task_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" UUID NOT NULL,
    "gameAccountId" UUID NOT NULL,
    "taskDefinitionId" UUID NOT NULL,
    "periodDate" DATE NOT NULL,
    "completedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_code_key" ON "games"("code");

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");

-- CreateIndex
CREATE INDEX "game_accounts_gameId_idx" ON "game_accounts"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_accounts_userId_gameId_key" ON "game_accounts"("userId", "gameId");

-- CreateIndex
CREATE INDEX "task_definitions_gameId_isActive_idx" ON "task_definitions"("gameId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "task_definitions_gameId_code_key" ON "task_definitions"("gameId", "code");

-- CreateIndex
CREATE INDEX "task_completions_gameAccountId_periodDate_idx" ON "task_completions"("gameAccountId", "periodDate");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_gameAccountId_taskDefinitionId_periodDate_key" ON "task_completions"("gameAccountId", "taskDefinitionId", "periodDate");

-- AddForeignKey
ALTER TABLE "game_accounts" ADD CONSTRAINT "game_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_accounts" ADD CONSTRAINT "game_accounts_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_definitions" ADD CONSTRAINT "task_definitions_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_gameAccountId_fkey" FOREIGN KEY ("gameAccountId") REFERENCES "game_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_taskDefinitionId_fkey" FOREIGN KEY ("taskDefinitionId") REFERENCES "task_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
