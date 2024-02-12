import {
  boolean,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { nanoid } from "nanoid";

export const roleEnum = pgEnum("role", ["ADMIN", "AUTHOR", "USER"]);

export const user = pgTable("user", {
  id: varchar("id", { length: 256 })
    .primaryKey()
    .notNull()
    .$defaultFn(() => nanoid()),
  name: varchar("name", { length: 256 }).notNull(),
  email: varchar("email", { length: 256 }).notNull(),
  password: varchar("password", { length: 256 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  avatar: varchar("avatar", { length: 256 }),
  role: roleEnum("role").default("USER").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

export const accounts = pgTable("account", {
  userId: varchar("user_id", { length: 256 })
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: varchar("provider", { length: 256 }).notNull(),
  providerAccountId: varchar("providerAccountId", { length: 256 })
    .notNull()
    .unique()
    .primaryKey(),
  refresh_token: varchar("refresh_token", { length: 600 }),
  access_token: varchar("access_token", { length: 600 }),
  expires_at: timestamp("expires_at"),
});

export const verificationToken = pgTable(
  "verificationToken",
  {
    id: text("id")
      .notNull()
      .$defaultFn(() => nanoid()),
    email: varchar("email").notNull().unique(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.id, vt.token] }),
  })
);

export type User = typeof user.$inferSelect;
export type UserWithoutPassword = Omit<User, "password">;
