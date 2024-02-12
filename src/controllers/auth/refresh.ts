import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { sign, verify } from "hono/jwt";
import { deleteCookie, getCookie } from "hono/cookie";
import { accounts, user } from "../../db/schemas/user.schema";
import { db } from "../../db";

export const refresh = async (c: Context) => {
  const refresh_token = await getCookie(c, "refreshToken");

  try {
    if (!refresh_token) {
      return c.json(
        {
          error: "User doesn't have a session!",
        },
        400
      );
    }

    const verifyToken = await verify(
      atob(refresh_token),
      process.env.REFRESH_TOKEN_SECRET!,
      "HS512"
    );

    if (!verifyToken) {
      await deleteCookie(c, "refreshToken");
      return c.json({ error: "Invalid Token!" }, 400);
    }

    const findUser = await db.query.user.findFirst({
      where: eq(user.email, verifyToken.email!),
    });

    if (!findUser) {
      await deleteCookie(c, "refreshToken");
      return c.json({ error: "User does not exist with this email!" }, 404);
    }

    const existingSession = await db.query.accounts.findFirst({
      where: eq(accounts.userId, findUser.id),
    });

    if (existingSession?.refresh_token !== atob(refresh_token)) {
      return c.json({ error: "Invalid Token received" }, 401);
    }

    const { password: pd, ...userWithoutPassword } = findUser;

    const accessToken = await sign(
      {
        userWithoutPassword,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.REFRESH_TOKEN_SECRET!,
      "HS512"
    );

    const updateSession = await db
      .update(accounts)
      .set({
        access_token: accessToken,
        expires_at: new Date(new Date().getTime() + 60 * 60 * 24 * 1),
      })
      .where(eq(accounts.providerAccountId, existingSession.providerAccountId))
      .returning();

    if (!updateSession[0]) {
      return c.json({ error: "Error while updating session!" }, 400);
    }

    return c.json({ accessToken: btoa(accessToken) }, 200);
  } catch (error) {
    return c.json({ error: "Server Error Happened!" }, 500);
  }
};
