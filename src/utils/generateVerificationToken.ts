import { nanoid } from "nanoid";
import { sign } from "hono/jwt";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { verificationToken } from "../db/schemas/user.schema";

export const generateVerificationToken = async (email: string) => {
  const emailToken = await sign(
    { email },
    process.env.EMAIL_VERIFICATION_SECRET!,
    "HS512"
  );
  const expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
  const existingToken = await db.query.verificationToken.findFirst({
    where: eq(verificationToken.email, email),
  });

  if (existingToken) {
    await db
      .delete(verificationToken)
      .where(eq(verificationToken.id, existingToken.id));
  }

  const newVerificationToken = await db
    .insert(verificationToken)
    .values({
      email,
      expires,
      token: emailToken,
    })
    .returning();

  return newVerificationToken;
};
