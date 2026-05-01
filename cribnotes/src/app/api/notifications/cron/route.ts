import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPushToUsers } from "@/lib/push";

type DueReminder = {
  userId: string;
  childId: string;
  childName: string;
  intervalMinutes: number;
  logId: string;
  occurredAt: Date;
};

function isAuthorized(request: Request) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const due = await prisma.$queryRaw<DueReminder[]>(Prisma.sql`
      WITH latest_feeds AS (
        SELECT DISTINCT ON ("childId")
          id,
          "childId",
          "occurredAt"
        FROM "Log"
        WHERE type = 'FEED'::"LogType" AND "deletedAt" IS NULL
        ORDER BY "childId", "occurredAt" DESC
      )
      SELECT
        np."userId",
        np."childId",
        c.name AS "childName",
        np."feedReminderIntervalMinutes" AS "intervalMinutes",
        lf.id AS "logId",
        lf."occurredAt"
      FROM "NotificationPreference" np
      JOIN latest_feeds lf ON lf."childId" = np."childId"
      JOIN "Child" c ON c.id = np."childId"
      WHERE np."feedReminderEnabled" = true
        AND COALESCE(np."lastFeedReminderSentForLogId", '') <> lf.id
        AND now() >= lf."occurredAt" + (np."feedReminderIntervalMinutes" * interval '1 minute')
        AND EXISTS (
          SELECT 1 FROM "PushSubscription" ps WHERE ps."userId" = np."userId"
        )
        AND (
          c."ownerId" = np."userId"
          OR EXISTS (
            SELECT 1
            FROM "ChildShare" s
            WHERE s."childId" = np."childId"
              AND s."userId" = np."userId"
              AND s.accepted = true
          )
        )
      LIMIT 100
    `);

    let sent = 0;
    let failed = 0;

    for (const reminder of due) {
      const result = await sendPushToUsers([reminder.userId], {
        title: `Time to feed ${reminder.childName}`,
        body: `It has been ${reminder.intervalMinutes} minutes since the last feeding.`,
        url: "/",
        tag: `feed-reminder-${reminder.childId}`,
      });
      sent += result.sent;
      failed += result.failed;

      if (result.sent > 0) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE "NotificationPreference"
          SET
            "lastFeedReminderSentForLogId" = ${reminder.logId},
            "lastFeedReminderSentAt" = now(),
            "updatedAt" = now()
          WHERE "userId" = ${reminder.userId} AND "childId" = ${reminder.childId}
        `);
      }
    }

    return NextResponse.json({ checked: due.length, sent, failed });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
