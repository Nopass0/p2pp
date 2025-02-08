import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    TELEGRAM_BOT_USERNAME: z.string().min(1),
    GATE_API_KEY: z.string().min(1),
    GATE_API_SECRET: z.string().min(1),
    INIT_ADMIN_KEY: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]),
    SERVICES_URL: z.string().url(),
  },
  client: {
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(1),
    NEXT_PUBLIC_SERVICES_URL: z.string().url(),
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_USERNAME: process.env.TELEGRAM_BOT_USERNAME,
    GATE_API_KEY: process.env.GATE_API_KEY,
    GATE_API_SECRET: process.env.GATE_API_SECRET,
    INIT_ADMIN_KEY: process.env.INIT_ADMIN_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    SERVICES_URL: process.env.SERVICES_URL,
    NEXT_PUBLIC_SERVICES_URL: process.env.NEXT_PUBLIC_SERVICES_URL,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
