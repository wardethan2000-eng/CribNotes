import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateLogSchema } from "@/lib/validations";
import { canAccessChild, canWriteToChild } from "@/lib/access";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: params.id } });
    if (!log || log.deletedAt) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const hasAccess = await canWriteToChild(userId, log.childId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const data = updateLogSchema.parse(body);

    const updated = await prisma.log.update({
      where: { id: params.id },
      data: {
        ...(data.occurredAt && { occurredAt: new Date(data.occurredAt) }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.feedAmount !== undefined && { feedAmount: data.feedAmount }),
        ...(data.feedUnit && { feedUnit: data.feedUnit }),
        ...(data.feedType && { feedType: data.feedType }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  try {
    const log = await prisma.log.findUnique({ where: { id: params.id } });
    if (!log) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const isOwner = await prisma.child.findFirst({
      where: { id: log.childId, ownerId: userId },
    });
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await prisma.log.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json(deleted);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}