import Elysia, { t } from "elysia";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import fs from "fs";
import sharp from "sharp";
import path from "path";
import { DbStore } from "../db";
import {
  users,
  sessions,
  passwordResetTokens,
  accounts,
  verificationTokens,
} from "../db/schemas/userSchema";
import { send } from "../mail";
import { verificationTemplate } from "../mail/templates/verification";
import { resetPasswordTemplate } from "../mail/templates/reset";

const JWT_SECRET = Bun.env.JWT_SECRET || "your_jwt_secret";

export const userRoutes = new Elysia().use(DbStore).group("/user", (app) =>
  app
    .get("/", async ({ db }) => {
      const allUsers = await db.query.users.findMany();
      return {
        success: true,
        message: "All users",
        users: allUsers,
      };
    })
    .post(
      "/sign-in",
      async ({ body, set, db, cookie }) => {
        const { email, password } = body;

        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            set.status = "Not Found";
            return {
              success: false,
              message: "No user found with the provided email",
            };
          }

          if (!user.passwordHash) {
            set.status = "Unauthorized";
            return {
              success: false,
              message:
                "User has used different provider to sign up. First login with that provider to your link account",
            };
          }

          const verifyPassword = await Bun.password.verify(
            password,
            user.passwordHash
          );

          if (!verifyPassword) {
            set.status = "Unauthorized";
            return { success: false, message: "Incorrect password" };
          }

          if (!user.emailVerified) {
            const verificationToken = jwt.sign({ email }, Bun.env.JWT_SECRET!, {
              expiresIn: "1h",
            });

            await db
              .delete(verificationTokens)
              .where(eq(verificationTokens.userId, user.id));

            const sendMailOptions = verificationTemplate({
              name: user.name,
              email: user.email,
              token: verificationToken,
            });

            const sendMail = await send(sendMailOptions);

            if (!sendMail.messageId) {
              set.status = "Internal Server Error";
              return {
                success: false,
                message: "Error while sending verification email",
              };
            }

            await db.insert(verificationTokens).values({
              userId: user.id,
              token: verificationToken,
              expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
            });

            set.status = "Unauthorized";
            return {
              success: false,
              message:
                "Please verify your email address before signing in. Check your inbox or spam folder for the verification link",
            };
          }

          const existingSession = await db.query.sessions.findFirst({
            where: eq(sessions.userId, user.id),
          });

          if (existingSession) {
            await db
              .delete(sessions)
              .where(eq(sessions.sessionId, existingSession.sessionId));
            await db
              .update(users)
              .set({ isActive: false })
              .where(eq(users.id, user.id));
          }

          const accessToken = jwt.sign(
            {
              user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatar: user.avatar,
              },
            },
            JWT_SECRET,
            { expiresIn: "1h" }
          );

          const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, {
            expiresIn: "7d",
          });

          await db.insert(sessions).values({
            sessionId: refreshToken,
            userId: user.id,
            accessToken: accessToken,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            userAgent: "", // Optional
            ipAddress: "", // Optional
          });

          await db
            .update(users)
            .set({ isActive: true })
            .where(eq(users.id, user.id));

          cookie.refresh_token.set({
            httpOnly: true,
            path: "/",
            sameSite: "lax",
            value: refreshToken,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          });

          set.status = "OK";
          return {
            success: true,
            message: "Signed In Successfully redirecting you to dashboard",
            accessToken,
          };
        } catch {
          set.status = "Internal Server Error";
          return {
            success: false,
            message: "Error while signing in",
          };
        }
      },
      {
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String({ minLength: 6 }),
        }),
      }
    )
    .post(
      "/sign-up",
      async ({ body, set, db }) => {
        const { name, email, password, avatar } = body;

        try {
          const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (existingUser) {
            set.status = "Conflict";
            return { success: false, message: "Email already exists" };
          }

          const hashedPassword = await Bun.password.hash(password);
          const arrayBuffer = Buffer.from(await avatar.arrayBuffer());
          const webpBuffer = await sharp(arrayBuffer)
            .rotate()
            .resize({ width: 500, height: 500, fit: "inside" })
            .webp({ quality: 80, lossless: true })
            .toBuffer();

          const dirname = path.resolve(import.meta.dir, "..", "..");

          const uploadsDir = path.join(dirname, "uploads");

          const fileName = `${crypto.randomUUID()}.webp`;
          const filePath = path.join(uploadsDir, fileName);

          await Bun.write(filePath, webpBuffer);

          const avatarUrl = `http://localhost:5000/uploads/${fileName}`;

          const newUser = await db
            .insert(users)
            .values({
              avatar: avatarUrl,
              name,
              email,
              passwordHash: hashedPassword,
              emailVerified: new Date(),
            })
            .returning();

          if (!newUser[0]) {
            set.status = "Not Implemented";
            return {
              success: false,
              message: "Something happened while saving user in database",
            };
          }

          await db.insert(accounts).values({
            userId: newUser[0].id,
            provider: "email",
            providerAccountId: email,
          });

          const verificationToken = jwt.sign({ email }, Bun.env.JWT_SECRET!, {
            expiresIn: "1h",
          });

          const sendMailOptions = verificationTemplate({
            name: newUser[0].name,
            email: newUser[0].email,
            token: verificationToken,
          });

          const sendMail = await send(sendMailOptions);

          if (!sendMail.messageId) {
            set.status = "Internal Server Error";
            return {
              success: false,
              message: "Failed to send verification email",
            };
          }

          await db.insert(verificationTokens).values({
            userId: newUser[0].id,
            token: verificationToken,
            expires: new Date(Date.now() + 1 * 60 * 60 * 1000),
          });

          set.status = "Created";
          return {
            success: true,
            message:
              "Signed up successfully. Please check your email for verification.",
          };
        } catch {
          set.status = "Internal Server Error";
          return {
            success: false,
            message: "Error while signing up",
          };
        }
      },
      {
        body: t.Object({
          name: t.String({ minLength: 3 }),
          email: t.String({ format: "email" }),
          password: t.String({ minLength: 6 }),
          avatar: t.File(),
        }),
      }
    )
    .get("/verify/:token", async ({ params: { token }, set, db }) => {
      if (!token) {
        set.status = "Not Found";
        return { success: false, message: "No verification token found" };
      }

      try {
        const existingVerificationToken =
          await db.query.verificationTokens.findFirst({
            where: eq(verificationTokens.token, token),
          });

        if (!existingVerificationToken) {
          set.status = "OK";
          return { success: false, message: "User already verified ��" };
        }

        const decodedVerificationToken = jwt.verify(token, JWT_SECRET) as {
          email: string;
        };

        if (!decodedVerificationToken) {
          set.status = "Bad Request";
          return { success: false, message: "Invalid verification token ��" };
        }

        const user = await db.query.users.findFirst({
          where: eq(users.email, decodedVerificationToken.email),
        });

        if (!user) {
          set.status = "Not Found";
          return {
            success: false,
            message: "No user found with the provided email ��",
          };
        }

        const updateVerification = await db
          .update(users)
          .set({
            emailVerified: new Date(),
          })
          .where(eq(users.id, user.id))
          .returning();

        if (!updateVerification[0]) {
          set.status = "Not Implemented";
          return {
            success: false,
            message: "Something happened while updating user in database ��",
          };
        }

        await db
          .delete(verificationTokens)
          .where(eq(verificationTokens.token, token));

        set.status = "OK";
        return { success: true, message: "Email verified successfully ��" };
      } catch (error) {
        set.status = "Internal Server Error";
        return {
          success: false,
          message: "Error while verifying user",
          error,
        };
      }
    })
    .delete("/logout", async ({ db, cookie, set, headers }) => {
      const accessToken = headers.authorization?.split(" ")[1];
      if (!accessToken) {
        set.status = "Unauthorized";
        return { success: false, message: "No access token found" };
      }

      const refreshToken = cookie.refresh_token.value;
      if (!refreshToken) {
        set.status = "Bad Request";
        return { success: false, message: "No refresh token found" };
      }

      try {
        const decodedAccessToken = jwt.verify(accessToken, JWT_SECRET) as {
          user: {
            id: string;
            name: string;
            email: string;
          };
        };
        const decodedRefreshToken = jwt.verify(refreshToken, JWT_SECRET) as {
          id: string;
        };

        if (decodedAccessToken.user.id !== decodedRefreshToken.id) {
          set.status = "Unauthorized";
          return { success: false, message: "Invalid tokens" };
        }
        await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, decodedAccessToken.user.id));
        await db.delete(sessions).where(eq(sessions.sessionId, refreshToken));
        cookie.refresh_token.remove();
        set.status = "OK";
        return { success: true, message: "Logged out successfully" };
      } catch (error) {
        set.status = "Internal Server Error";
        return { success: false, message: "Error while logging out", error };
      }
    })
    .get("/refresh", async ({ db, cookie, set }) => {
      const refreshToken = cookie.refresh_token.value;
      if (!refreshToken) {
        set.status = "OK";
        return { success: true, message: "No User is Authenticated" };
      }

      try {
        const existingRefreshToken = await db.query.sessions.findFirst({
          where: eq(sessions.sessionId, refreshToken),
        });

        if (!existingRefreshToken) {
          cookie.refresh_token.remove();
          set.status = "Not Found";
          return { success: false, message: "Refresh token not found ��" };
        }

        const decodedRefreshToken = jwt.verify(refreshToken, JWT_SECRET) as {
          id: string;
        };

        if (!decodedRefreshToken.id) {
          await db
            .delete(sessions)
            .where(eq(sessions.sessionId, existingRefreshToken.sessionId));
          await db
            .update(users)
            .set({ isActive: false })
            .where(eq(users.id, existingRefreshToken.userId));
          cookie.refresh_token.remove();
          set.status = "Unauthorized";
          return {
            success: false,
            message: "Invalid refresh token or expired",
          };
        }

        const user = await db.query.users.findFirst({
          where: eq(users.id, decodedRefreshToken.id),
        });

        if (!user) {
          set.status = "Not Found";
          return {
            success: false,
            message: "User not found with the provided refresh token",
          };
        }

        await db
          .update(users)
          .set({ isActive: false })
          .where(eq(users.id, user.id));

        const newAccessToken = jwt.sign(
          {
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
            },
          },
          JWT_SECRET,
          { expiresIn: "1h" }
        );

        await db
          .update(sessions)
          .set({ accessToken: newAccessToken })
          .where(eq(sessions.userId, user.id));

        await db
          .update(users)
          .set({ isActive: true })
          .where(eq(users.id, user.id));

        set.status = "OK";
        return {
          success: true,
          message: "Token refreshed",
          accessToken: newAccessToken,
        };
      } catch (error) {
        set.status = "Unauthorized";
        return {
          success: false,
          message: "Error while refreshing access token",
          error,
        };
      }
    })
    .post(
      "/request-password-reset",
      async ({ body, db, set }) => {
        const { email } = body;

        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, email),
          });

          if (!user) {
            set.status = "Not Found";
            return { success: false, message: "Email not found 🙁" };
          }

          const existingResetPasswordToken =
            await db.query.passwordResetTokens.findFirst({
              where: eq(sessions.userId, user.id),
            });

          if (existingResetPasswordToken) {
            await db
              .delete(passwordResetTokens)
              .where(eq(passwordResetTokens.userId, user.id));
          }

          const expires = new Date(Date.now() + 60 * 60 * 1000);

          const resetPasswordToken = jwt.sign({ email }, Bun.env.JWT_SECRET!, {
            expiresIn: "1h",
          });

          const sendMailOptions = resetPasswordTemplate({
            name: user.name,
            email: user.email,
            token: resetPasswordToken,
          });

          const sendMail = await send(sendMailOptions);

          if (!sendMail.messageId) {
            set.status = "Internal Server Error";
            return {
              success: false,
              message: "Failed to send reset password email",
            };
          }

          await db.insert(passwordResetTokens).values({
            userId: user.id,
            token: resetPasswordToken,
            expires,
          });

          set.status = "OK";
          return { success: true, message: "Password reset token sent" };
        } catch (error) {
          set.status = "Internal Server Error";
          return {
            success: false,
            message: "Error while sending reset password email",
            error,
          };
        }
      },
      {
        body: t.Object({
          email: t.String({ format: "email" }),
        }),
      }
    )
    .post(
      "/password-reset/:token",
      async ({ body, db, set, params: { token } }) => {
        if (!token) {
          set.status = "Not Found";
          return { success: false, message: "No password reset token found" };
        }

        try {
          const existingResetPasswordToken =
            await db.query.passwordResetTokens.findFirst({
              where: eq(passwordResetTokens.token, token),
            });

          if (!existingResetPasswordToken) {
            set.status = "Not Found";
            return {
              success: false,
              message: "Reset password token not found ��",
            };
          }
          const decodedPasswordToken = jwt.verify(token, JWT_SECRET) as {
            email: string;
          };

          if (!decodedPasswordToken) {
            set.status = "Unauthorized";
            return {
              success: false,
              message: "Invalid password reset token ��",
            };
          }

          const { password } = body;

          const user = await db.query.users.findFirst({
            where: eq(users.email, decodedPasswordToken.email),
          });

          if (!user) {
            set.status = "Not Found";
            return { success: false, message: "Email not found" };
          }

          const hashedPassword = await Bun.password.hash(password);

          const updatePassword = await db
            .update(users)
            .set({
              passwordHash: hashedPassword,
            })
            .where(eq(users.email, decodedPasswordToken.email))
            .returning();

          if (!updatePassword[0]) {
            set.status = "Internal Server Error";
            return { success: false, message: "Failed to update password ��" };
          }

          await db
            .delete(passwordResetTokens)
            .where(eq(passwordResetTokens.token, token));

          set.status = "OK";
          return { success: true, message: "Password successfully updated" };
        } catch (error) {
          set.status = "Internal Server Error";
          return {
            success: false,
            message: "Failed to reset password ��",
            error,
          };
        }
      },
      {
        body: t.Object({
          password: t.String(),
        }),
      }
    )
);
