import {
  boolean,
  timestamp,
  pgTable,
  text,
  primaryKey,
} from "drizzle-orm/pg-core";

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => Bun.randomUUIDv7()),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  avatar: text("avatar"),
  passwordHash: text("passwordHash"),
  isActive: boolean("is_active").default(false),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }),
});

export const accounts = pgTable(
  "account",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => Bun.randomUUIDv7()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
  },
  (account) => {
    return [
      {
        compoundKey: primaryKey({
          columns: [account.provider, account.providerAccountId],
        }),
      },
    ];
  }
);

export const sessions = pgTable("session", {
  sessionId: text("sessionId").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
  accessToken: text("accessToken"),
  userAgent: text("userAgent"),
  ipAddress: text("ipAddress"),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (verificationToken) => {
    return [
      {
        compositePk: primaryKey({
          columns: [verificationToken.userId, verificationToken.token],
        }),
      },
    ];
  }
);

export const passwordResetTokens = pgTable(
  "passwordResetToken",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (passwordResetToken) => {
    return [
      {
        compositePK: primaryKey({
          columns: [passwordResetToken.userId, passwordResetToken.token],
        }),
      },
    ];
  }
);
