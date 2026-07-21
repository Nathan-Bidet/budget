import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, "JWT_SECRET doit faire au moins 16 caractères"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  BACKEND_PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
