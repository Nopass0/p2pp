import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    TELEGRAM_BOT_TOKEN: z.string().min(1),
    INIT_ADMIN_KEY: z.string().min(1),
    NEXT_PUBLIC_APP_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    RUN_WORKERS_LOCALLY: z.boolean().default(false),
  },
  client: {
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: z.string().min(1),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    INIT_ADMIN_KEY: process.env.INIT_ADMIN_KEY,
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_TELEGRAM_BOT_USERNAME:
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    RUN_WORKERS_LOCALLY: process.env.RUN_WORKERS_LOCALLY,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
