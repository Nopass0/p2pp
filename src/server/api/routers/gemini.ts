// src/server/api/routers/gemini.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

const activateInput = z.object({
  key: z.string(),
});

export const geminiRouter = createTRPCRouter({
  setUserGeminiToken: protectedProcedure
    .input(activateInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      const updatedUser = await ctx.db.user.update({
        where: { id: user.id },
        //@ts-ignore
        data: { geminiToken: input.key },
      });

      return { success: true };
    }),

  getUserGeminiToken: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }
    //@ts-ignore
    return { token: user.geminiToken };
  }),
});
