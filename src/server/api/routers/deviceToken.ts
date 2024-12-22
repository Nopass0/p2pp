// src/server/api/routers/deviceToken.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { randomBytes } from "crypto";

export const deviceTokenRouter = createTRPCRouter({
  getMyTokens: protectedProcedure.query(async ({ ctx }) => {
    const tokens = await ctx.db.deviceToken.findMany({
      where: {
        userId: ctx.user.id,
      },
      orderBy: {
        lastUsed: "desc",
      },
    });
    return tokens;
  }),

  createToken: protectedProcedure
    .input(
      z.object({
        deviceId: z.string().min(1),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Generate a secure random token
      const token = randomBytes(32).toString("hex");

      try {
        const deviceToken = await ctx.db.deviceToken.create({
          data: {
            userId: ctx.user.id,
            token,
            deviceId: input.deviceId,
            name: input.name,
          },
        });

        return {
          success: true,
          token: deviceToken.token,
        };
      } catch (error) {
        if (error.code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Device token already exists for this device",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create device token",
        });
      }
    }),

  deleteToken: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: tokenId }) => {
      try {
        await ctx.db.deviceToken.deleteMany({
          where: {
            id: parseInt(tokenId),
            userId: ctx.user.id,
          },
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete token",
        });
      }
    }),

  updateLastUsed: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input: token }) => {
      try {
        await ctx.db.deviceToken.updateMany({
          where: {
            token,
            userId: ctx.user.id,
          },
          data: {
            lastUsed: new Date(),
          },
        });

        return { success: true };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update token usage",
        });
      }
    }),
});
