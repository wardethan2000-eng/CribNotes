CREATE TYPE "NotePurpose" AS ENUM ('GUIDE', 'INSTRUCTION', 'UPDATE', 'QUESTION', 'GENERAL');

CREATE TYPE "NoteAudience" AS ENUM ('EVERYONE', 'PARENTS', 'CAREGIVERS', 'SPECIFIC');

CREATE TABLE "Note" (
  "id" TEXT NOT NULL,
  "childId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "purpose" "NotePurpose" NOT NULL DEFAULT 'GENERAL',
  "audience" "NoteAudience" NOT NULL DEFAULT 'EVERYONE',
  "attentionName" TEXT,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Note_childId_audience_pinned_createdAt_idx" ON "Note"("childId", "audience", "pinned", "createdAt");

ALTER TABLE "Note" ADD CONSTRAINT "Note_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
