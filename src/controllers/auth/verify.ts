import { eq } from "drizzle-orm";
import { Context } from "hono";
import { verify as v } from "hono/jwt";
import { db } from "../../db";
import { user, verificationToken } from "../../db/schemas/user.schema";

export const verify = async (c: Context) => {
  const token = atob(c.req.param("token"));

  try {
    if (!token) {
      return c.json({ error: "No Token received" }, 400);
    }

    const verifyToken = (await v(
      token,
      process.env.EMAIL_VERIFICATION_SECRET!,
      "HS512"
    )) as { email: string };

    if (!verifyToken.email) {
      return c.json({ error: "Invalid Token" }, 400);
    }

    const existingUser = await db.query.user.findFirst({
      where: eq(verificationToken.email, verifyToken.email),
    });

    if (!existingUser) {
      return c.json({ error: "Invalid Token" }, 401);
    }

    if (existingUser.emailVerified) {
      return c.json({ error: "Email already verified!" }, 400);
    }

    const existingToken = await db.query.verificationToken.findFirst({
      where: eq(verificationToken.email, verifyToken.email),
    });

    if (!existingToken) {
      return c.json({ error: "Invalid Token" }, 401);
    }

    const updateUser = await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.email, existingToken.email))
      .returning();

    const deleteToken = await db
      .delete(verificationToken)
      .where(eq(verificationToken.id, existingToken.id))
      .returning();

    if (!deleteToken[0] && !updateUser[0]) {
      return c.json({ error: "Error while verifying!" }, 400);
    }

    return c.json({ success: "Successfully Verified!" }, 200);
  } catch (error) {
    return c.json({ error: "Something went wrong!" }, 500);
  }
};
