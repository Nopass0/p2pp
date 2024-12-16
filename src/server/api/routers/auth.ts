import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  verifyTelegramAuth,
  validateAuthDate,
  type TelegramUser,
} from "@/lib/telegram";

const telegramAuthSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().optional(),
  auth_date: z.number(),
  hash: z.string(),
});

export const authRouter = createTRPCRouter({
  getSession: protectedProcedure.query(({ ctx }) => {
    if (!ctx.user) return null;
    return { user: ctx.user };
  }),

  telegramAuth: publicProcedure
    .input(telegramAuthSchema)
    .mutation(async ({ ctx, input }) => {
      console.log("Starting Telegram auth with input:", input);

      if (!ctx.db) {
        console.error("Database connection not available");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection not available",
        });
      }

      try {
        console.log("Verifying Telegram auth data...");
        const isValid = await verifyTelegramAuth(input);
        console.log("Auth verification result:", isValid);

        if (!isValid) {
          console.error("Invalid authentication data");
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid authentication data",
          });
        }

        console.log("Validating auth date...");
        if (!validateAuthDate(input.auth_date)) {
          console.error("Authentication data expired");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Authentication data has expired",
          });
        }

        console.log("Starting database transaction...");
        const result = await ctx.db.$transaction(async (tx) => {
          console.log("Creating/updating user...");
          const user = await tx.user.upsert({
            where: { telegramId: input.id.toString() },
            update: {
              firstName: input.first_name,
              lastName: input.last_name || null,
              username: input.username || null,
              photoUrl: input.photo_url || null,
            },
            create: {
              telegramId: input.id.toString(),
              firstName: input.first_name,
              lastName: input.last_name || null,
              username: input.username || null,
              photoUrl: input.photo_url || null,
              isAdmin: false,
            },
          });
          console.log("User created/updated:", user);

          const token = randomUUID();
          console.log("Creating session...");
          const session = await tx.session.create({
            data: {
              userId: user.id,
              token,
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
          console.log("Session created:", session);

          return {
            token,
            user: {
              id: user.id,
              telegramId: user.telegramId,
              firstName: user.firstName,
              lastName: user.lastName,
              username: user.username,
              photoUrl: user.photoUrl,
              isAdmin: user.isAdmin,
            },
          };
        });

        console.log("Transaction completed successfully, returning result:", result);
        return result;
      } catch (error) {
        console.error("Error in telegramAuth:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof Error) {
          console.error("Error details:", {
            name: error.name,
            message: error.message,
            stack: error.stack
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Authentication failed",
          cause: error,
        });
      }
    }),
});