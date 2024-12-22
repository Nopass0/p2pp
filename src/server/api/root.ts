// src/server/api/root.ts
import { authRouter } from "@/server/api/routers/auth";
import { userRouter } from "@/server/api/routers/user";
import { adminRouter } from "@/server/api/routers/admin";
import { gateRouter } from "@/server/api/routers/gate";
import { walletRouter } from "@/server/api/routers/wallet";
import { createTRPCRouter } from "@/server/api/trpc";
import { deviceTokenRouter } from "@/server/api/routers/deviceToken";
import { geminiRouter } from "./routers/gemini";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  admin: adminRouter,
  gate: gateRouter,
  wallet: walletRouter,
  deviceToken: deviceTokenRouter,
  gemini: geminiRouter,
});

export type AppRouter = typeof appRouter;
