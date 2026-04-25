import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/resend";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      await prisma.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token: hashedToken,
          expires: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await sendPasswordResetEmail(email, token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}