import { Prisma } from "@prisma/client";
import webpush, { type PushSubscription as WebPushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

let configured = false;

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || "";
}

export function isPushConfigured() {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

function configureWebPush() {
  if (configured || !isPushConfigured()) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@cribnotes.baby",
    getVapidPublicKey(),
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

function toWebPushSubscription(subscription: StoredSubscription): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!isPushConfigured() || userIds.length === 0) return { sent: 0, failed: 0 };

  configureWebPush();

  const uniqueUserIds = Array.from(new Set(userIds));
  const subscriptions = await prisma.$queryRaw<StoredSubscription[]>(Prisma.sql`
    SELECT id, endpoint, p256dh, auth
    FROM "PushSubscription"
    WHERE "userId" IN (${Prisma.join(uniqueUserIds)})
  `);

  let sent = 0;
  let failed = 0;

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(toWebPushSubscription(subscription), JSON.stringify(payload));
      sent += 1;
    } catch (error: any) {
      failed += 1;
      if (error?.statusCode === 404 || error?.statusCode === 410) {
        await prisma.$executeRaw(Prisma.sql`
          DELETE FROM "PushSubscription" WHERE id = ${subscription.id}
        `);
      }
    }
  }));

  return { sent, failed };
}

export async function getUsersForSpecificAttention(childId: string, attentionName: string, authorId: string) {
  const attention = attentionName.trim().toLowerCase();
  if (!attention) return [];

  const users = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    WITH child_users AS (
      SELECT u.id, u.name, u.email
      FROM "Child" c
      JOIN "User" u ON u.id = c."ownerId"
      WHERE c.id = ${childId}
      UNION
      SELECT u.id, u.name, u.email
      FROM "ChildShare" s
      JOIN "User" u ON u.id = s."userId"
      WHERE s."childId" = ${childId} AND s.accepted = true AND s."userId" IS NOT NULL
    )
    SELECT cu.id
    FROM child_users cu
    LEFT JOIN "NotificationPreference" np
      ON np."userId" = cu.id AND np."childId" = ${childId}
    WHERE cu.id <> ${authorId}
      AND COALESCE(np."noteAttentionEnabled", true) = true
      AND (
        lower(trim(cu.email)) = ${attention}
        OR lower(trim(COALESCE(cu.name, ''))) = ${attention}
      )
  `);

  return users.map((user) => user.id);
}

export async function notifyNoteAttention(options: {
  childId: string;
  authorId: string;
  title: string;
  body: string;
  attentionName: string | null;
}) {
  if (!options.attentionName) return;

  const userIds = await getUsersForSpecificAttention(options.childId, options.attentionName, options.authorId);
  await sendPushToUsers(userIds, {
    title: "Note for your attention",
    body: options.title || options.body.slice(0, 120),
    url: "/notes",
    tag: `note-attention-${options.childId}`,
  });
}
