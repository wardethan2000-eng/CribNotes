CREATE TYPE "UserDesignation" AS ENUM ('PARENT', 'CARETAKER', 'BABYSITTER');

ALTER TABLE "User"
  ADD COLUMN "designation" "UserDesignation" NOT NULL DEFAULT 'PARENT';

ALTER TYPE "ShareRole" RENAME TO "ShareRole_old";

CREATE TYPE "ShareRole" AS ENUM ('PARENT', 'CARETAKER', 'BABYSITTER');

ALTER TABLE "ChildShare"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "ShareRole"
  USING (
    CASE "role"::text
      WHEN 'CAREGIVER' THEN 'CARETAKER'
      WHEN 'VIEWER' THEN 'BABYSITTER'
      ELSE "role"::text
    END
  )::"ShareRole",
  ALTER COLUMN "role" SET DEFAULT 'CARETAKER';

DROP TYPE "ShareRole_old";
