import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessChild, canWriteToChild, getChildRole } from "@/lib/access";
import { createNoteSchema } from "@/lib/validations";

type NoteAudience = "EVERYONE" | "PARENTS" | "CAREGIVERS" | "SPECIFIC";

type RawNote = {
  id: string;
  childId: string;
  userId: string;
  title: string;
  body: string;
  purpose: string;
  audience: NoteAudience;
  attentionName: string | null;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  childOwnerId: string;
  userName: string | null;
  userEmail: string;
};

function isForUser(
  note: { audience: NoteAudience; attentionName: string | null },
  role: "OWNER" | "CAREGIVER" | "VIEWER" | null,
  user: { name: string | null; email: string }
) {
  if (note.audience === "EVERYONE") return true;
  if (note.audience === "PARENTS") return role === "OWNER";
  if (note.audience === "CAREGIVERS") return role === "CAREGIVER" || role === "VIEWER";

  const attention = note.attentionName?.trim().toLowerCase();
  if (!attention) return false;

  return [user.name, user.email]
    .filter(Boolean)
    .some((value) => value!.trim().toLowerCase() === attention);
}

function serializeNote(note: RawNote) {
  return {
    id: note.id,
    childId: note.childId,
    userId: note.userId,
    title: note.title,
    body: note.body,
    purpose: note.purpose,
    audience: note.audience,
    attentionName: note.attentionName,
    pinned: note.pinned,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    user: { id: note.userId, name: note.userName, email: note.userEmail },
    authorKind: note.childOwnerId === note.userId ? "Parent" : "Caretaker",
  };
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get("childId");
    const attention = searchParams.get("attention");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    if (!childId) {
      return NextResponse.json({ error: "Missing childId" }, { status: 400 });
    }

    const child = await canAccessChild(userId, childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [role, user, notes] = await Promise.all([
      getChildRole(userId, childId),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      }),
      prisma.$queryRaw<RawNote[]>(Prisma.sql`
        SELECT
          n.id,
          n."childId",
          n."userId",
          n.title,
          n.body,
          n.purpose::text AS purpose,
          n.audience::text AS audience,
          n."attentionName",
          n.pinned,
          n."createdAt",
          n."updatedAt",
          c."ownerId" AS "childOwnerId",
          u.name AS "userName",
          u.email AS "userEmail"
        FROM "Note" n
        JOIN "Child" c ON c.id = n."childId"
        JOIN "User" u ON u.id = n."userId"
        WHERE n."childId" = ${childId}
        ORDER BY n.pinned DESC, n."createdAt" DESC
        LIMIT ${attention === "mine" ? 100 : limit}
      `),
    ]);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filtered = attention === "mine"
      ? notes.filter((note) => isForUser(note, role, user)).slice(0, limit)
      : notes;

    return NextResponse.json({ notes: filtered.map(serializeNote) });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await request.json();
    const data = createNoteSchema.parse(body);

    const child = await canWriteToChild(userId, data.childId);
    if (!child) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [note] = await prisma.$queryRaw<RawNote[]>(Prisma.sql`
      INSERT INTO "Note" (
        id,
        "childId",
        "userId",
        title,
        body,
        purpose,
        audience,
        "attentionName",
        pinned,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${data.childId},
        ${userId},
        ${data.title},
        ${data.body},
        ${data.purpose}::"NotePurpose",
        ${data.audience}::"NoteAudience",
        ${data.audience === "SPECIFIC" ? data.attentionName || null : null},
        ${data.pinned ?? false},
        now(),
        now()
      )
      RETURNING
        id,
        "childId",
        "userId",
        title,
        body,
        purpose::text AS purpose,
        audience::text AS audience,
        "attentionName",
        pinned,
        "createdAt",
        "updatedAt",
        (SELECT "ownerId" FROM "Child" WHERE id = "Note"."childId") AS "childOwnerId",
        (SELECT name FROM "User" WHERE id = "Note"."userId") AS "userName",
        (SELECT email FROM "User" WHERE id = "Note"."userId") AS "userEmail"
    `);

    return NextResponse.json(serializeNote(note));
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
