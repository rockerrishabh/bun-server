import { z } from "zod";

export const signInContext = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type SignInContext = z.infer<typeof signInContext>;

export const signUpContext = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export type SignUpContext = z.infer<typeof signUpContext>;
