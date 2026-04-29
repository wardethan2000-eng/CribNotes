import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOwner } from "@/lib/access";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const [note] = await prisma.$queryRaw<{ id: string; childId: string; userId: string }[]>(Prisma.sql`
      SELECT id, "childId", "userId"
      FROM "Note"
      WHERE id = ${params.id}
      LIMIT 1
    `);

    if (!note) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const ownsChild = await isOwner(userId, note.childId);
    if (!ownsChild && note.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$executeRaw(Prisma.sql`DELETE FROM "Note" WHERE id = ${params.id}`);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
