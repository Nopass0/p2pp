// src/server/api/routers/user.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type TronTransaction, type TronWallet } from "@prisma/client";

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(async ({ ctx }) => {
    console.log("user.me called, ctx.user:", ctx.user); // Log the user
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        TronWallet: true,
      },
    });
    console.log("user.me result:", user); // Log the result
    return user;
  }),

  setTronWallet: protectedProcedure
    .input(z.string().trim().min(1))
    .mutation(async ({ ctx, input: address }) => {
      try {
        if (!address.match(/^T[A-Za-z0-9]{33}$/)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid TRON wallet address format",
          });
        }

        console.log("Received address:", address);
        console.log("User ID:", ctx.user.id);

        const wallet = await ctx.db.tronWallet.upsert({
          where: {
            userId: ctx.user.id,
          },
          update: {
            address,
            isActive: true,
          },
          create: {
            userId: ctx.user.id,
            address,
            isActive: true,
          },
        });

        console.log("Created/Updated wallet:", wallet);
        return { success: true, wallet };
      } catch (error) {
        console.error("Error in setTronWallet:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update wallet",
          cause: error,
        });
      }
    }),

  getTronTransactions: protectedProcedure
    .input(
      z.object({
        startDate: z
          .string()
          .transform((str) => new Date(str))
          .optional(),
        endDate: z
          .string()
          .transform((str) => new Date(str))
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(
      async ({
        ctx,
        input,
      }): Promise<{ transactions: any[]; total: number }> => {
        console.log("Query input:", input);

        const where = {
          userId: ctx.user.id,
          ...(input.startDate && input.endDate
            ? {
                timestamp: {
                  gte: input.startDate,
                  lte: input.endDate,
                },
              }
            : {}),
        };

        console.log("Fetching transactions with where clause:", where);

        try {
          const [transactions, total] = await Promise.all([
            ctx.db.tronTransaction.findMany({
              where,
              orderBy: {
                timestamp: "desc",
              },
              take: input.limit,
              skip: input.offset,
              include: {
                wallet: true,
              },
            }),
            ctx.db.tronTransaction.count({ where }),
          ]);

          console.log(
            `Found ${transactions.length} transactions, total: ${total}`,
          );

          // Добавляем тип транзакции на основе адреса кошелька
          const processedTransactions = transactions.map((tx) => ({
            ...tx,
            type:
              tx.toAddress.toLowerCase() ===
              ctx.user?.TronWallet?.address.toLowerCase()
                ? "incoming"
                : "outgoing",
          }));

          return {
            transactions: processedTransactions,
            total,
          };
        } catch (error) {
          console.error("Error fetching transactions:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to fetch transactions",
            cause: error,
          });
        }
      },
    ),
});
