import { Hono } from "hono";
import { validator } from "hono/validator";
import { signIn } from "../controllers/auth/signIn";
import { signUp } from "../controllers/auth/signUp";
import { refresh } from "../controllers/auth/refresh";
import { signInContext, signUpContext } from "../types/body";
import { verify } from "../controllers/auth/verify";

const auth = new Hono();

auth.post(
  "/sign-in",
  validator("json", (value, c) => {
    const parsed = signInContext.safeParse(value);
    if (!parsed.success) {
      return c.text("Invalid!", 401);
    }
    return parsed.data;
  }),
  signIn
);
auth.post(
  "/sign-up",
  validator("json", (value, c) => {
    const parsed = signUpContext.safeParse(value);
    if (!parsed.success) {
      return c.text("Invalid!", 401);
    }
    return parsed.data;
  }),
  signUp
);
auth.post("/refresh", refresh);
auth.post("/verify/:token", verify);

export { auth };
