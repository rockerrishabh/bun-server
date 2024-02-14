import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { sign } from "hono/jwt";
import { accounts, user } from "../../db/schemas/user.schema";
import { emailVerification } from "../../mail/templates/emailVerification";
import { sendMail } from "../../mail/sendMail";
import type { SignInContext } from "../../types/body";
import { db } from "../../db";
import { generateVerificationToken } from "../../utils/generateVerificationToken";

export const signIn = async (c: Context) => {
  const refresh_token = await getCookie(c, "refreshToken");

  const { email, password } = c.req.valid("json" as never) as SignInContext;

  try {
    if (refresh_token) {
      return c.json(
        {
          error: "User already has a session!",
        },
        400
      );
    }

    if (!email || !password) {
      return c.json({ error: "Please provide valid fields!" }, 400);
    }
    const findUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!findUser) {
      return c.json({ error: "User does not exist with this email!" }, 404);
    }

    if (!findUser.password) {
      return c.json({ error: "You used a different provider to Sign Up" }, 400);
    }

    const verifyPassword = await Bun.password.verify(
      password,
      findUser.password,
      "bcrypt"
    );
    if (!verifyPassword) {
      return c.json({ error: "Password does not match!" });
    }

    if (!findUser.emailVerified) {
      const verificationToken = await generateVerificationToken(findUser.email);
      const generateEmailVerificationMail = await emailVerification(
        verificationToken[0].email,
        btoa(verificationToken[0].token)
      );
      const sendVerificationMail = await sendMail(
        generateEmailVerificationMail.to,
        generateEmailVerificationMail.subject,
        generateEmailVerificationMail.html
      );

      if (!sendVerificationMail?.messageId) {
        return c.json({ error: "Error while sending Verification Mail!" }, 400);
      }

      return c.json(
        {
          success: "Verification Mail send Successfully!",
        },
        200
      );
    }

    const { password: pd, ...userWithoutPassword } = findUser;

    const refreshToken = await sign(
      {
        email,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.REFRESH_TOKEN_SECRET!,
      "HS512"
    );
    const accessToken = await sign(
      {
        userWithoutPassword,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 1,
        iat: Math.floor(Date.now() / 1000),
      },
      process.env.REFRESH_TOKEN_SECRET!,
      "HS512"
    );

    const createSession = await db
      .update(accounts)
      .set({
        refresh_token: refreshToken,
        access_token: accessToken,
        expires_at: new Date(new Date().getTime() + 24 * 60 * 60 * 1000),
      })
      .where(eq(accounts.userId, findUser.id))
      .returning();

    if (!createSession[0]) {
      return c.json({ error: "Error while creating session!" });
    }

    setCookie(c, "refreshToken", btoa(refreshToken), {
      path: "/",
      httpOnly: true,
      domain: "codingduniya.online",
      expires: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000),
      sameSite: "Strict",
    });

    return c.json({ accessToken: btoa(accessToken) }, 200);
  } catch (error) {
    return c.json({ error: "Server Error Happened!" }, 500);
  }
};
