import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

type PersonRole = "PARENT" | "CARETAKER" | "BABYSITTER";

export async function canAccessChild(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { ownerId: userId },
        { sharedWith: { some: { userId, accepted: true } } },
      ],
    },
  });
  return child;
}

export async function canWriteToChild(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: {
      id: childId,
      OR: [
        { ownerId: userId },
        { sharedWith: { some: { userId, accepted: true } } },
      ],
    },
  });
  return child;
}

export async function isOwner(userId: string, childId: string) {
  const child = await prisma.child.findFirst({
    where: { id: childId, ownerId: userId },
  });
  return !!child;
}

export async function getChildRole(userId: string, childId: string): Promise<"PARENT" | "CARETAKER" | "BABYSITTER" | null> {
  const [ownedChild] = await prisma.$queryRaw<{ designation: PersonRole }[]>(Prisma.sql`
    SELECT u.designation::text AS designation
    FROM "Child" c
    JOIN "User" u ON u.id = c."ownerId"
    WHERE c.id = ${childId} AND c."ownerId" = ${userId}
    LIMIT 1
  `);
  if (ownedChild) return ownedChild.designation;

  const [share] = await prisma.$queryRaw<{ role: PersonRole }[]>(Prisma.sql`
    SELECT role::text AS role
    FROM "ChildShare"
    WHERE "childId" = ${childId} AND "userId" = ${userId} AND accepted = true
    LIMIT 1
  `);
  if (share) return share.role;
  return null;
}
