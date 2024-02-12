import "dotenv/config";
import type { Config } from "drizzle-kit";
import { config } from "./src/db/config";

export default {
  schema: "./src/db/schemas",
  out: "./.drizzle",
  driver: "pg",
  dbCredentials: {
    ...config,
  },
} satisfies Config;
