import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import path from "path";
import fs from "fs";
import { staticPlugin } from "@elysiajs/static";
import { userRoutes } from "./routes/userRoutes";

const uploadsDir = path.resolve(__dirname, "..");

const app = new Elysia()
  .use(
    cors({
      credentials: true,
    })
  )
  .use(staticPlugin({ assets: `${uploadsDir}/uploads`, prefix: "/uploads" }))
  .use(userRoutes);

app.get("/", "Hello Elysia");

Bun.serve({
  fetch: app.fetch,
  port: 5000,
  maxRequestBodySize: 1024 * 1024 * 256,
});
