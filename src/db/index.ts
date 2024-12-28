import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as userSchema from "./schemas/userSchema";
import * as postSchema from "./schemas/postsSchema";
import Elysia from "elysia";

const pool = new Pool({
  connectionString: Bun.env.DATABASE_URL!,
});

export const database = drizzle({
  client: pool,
  schema: {
    ...userSchema,
    ...postSchema,
  },
});

export const DbStore = new Elysia().decorate("db", database);
