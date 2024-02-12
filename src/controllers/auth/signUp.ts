import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { accounts, user } from "../../db/schemas/user.schema";
import { sendMail } from "../../mail/sendMail";
import { emailVerification } from "../../mail/templates/emailVerification";
import type { SignUpContext } from "../../types/body";
import { db } from "../../db";
import { generateVerificationToken } from "../../utils/generateVerificationToken";
import { nanoid } from "nanoid";

export const signUp = async (c: Context) => {
  const refresh_token = await getCookie(c, "refreshToken");
  const { name, email, password } = c.req.valid(
    "json" as never
  ) as SignUpContext;
  try {
    if (refresh_token) {
      return c.json(
        {
          error: "User already has a session!",
        },
        400
      );
    }
    if (!name || !email || !password) {
      return c.json({ error: "Please provide valid fields!" }, 400);
    }
    const findUser = await db.query.user.findFirst({
      where: eq(user.email, email),
    });
    if (findUser) {
      return c.json({ error: "User already exists with this email!" }, 400);
    }
    const hashedPassword = await Bun.password.hash(password, {
      algorithm: "bcrypt",
    });
    const newUser = await db
      .insert(user)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning();

    const createAccount = await db
      .insert(accounts)
      .values({
        provider: "credentials",
        providerAccountId: nanoid(),
        userId: newUser[0].id,
      })
      .returning();

    if (!newUser[0] && !createAccount[0]) {
      return c.json({ error: "Something went Wrong creating User!" }, 400);
    }

    const verificationToken = await generateVerificationToken(newUser[0].email);

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
      return c.json({ error: "Error while sending Verification Mail" }, 400);
    }

    return c.json(
      {
        success: "Verification Mail send Successfully!",
      },
      201
    );
  } catch (error) {
    return c.json({ error: "Server Error Happened!" }, 500);
  }
};
