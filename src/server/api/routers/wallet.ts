// src/server/api/routers/wallet.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import axios from "axios";
import { env } from "@/env";
import { type PrismaClient } from "@prisma/client";

export const walletRouter = createTRPCRouter({
  getAllP2PTransactions: adminProcedure
    .input(
      z.object({
        user_ids: z.array(z.number()).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      //@ts-ignore

      const where: Prisma.P2PTransactionWhereInput = {};

      if (input.user_ids && input.user_ids.length > 0) {
        where.userId = { in: input.user_ids };
      }

      if (input.startDate && input.endDate) {
        where.completedAt = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }

      const transactions = await ctx.db.p2PTransaction.findMany({
        where,
        orderBy: { completedAt: "desc" },
      });

      return transactions;
    }),

  getAllMatches: adminProcedure
    .input(
      z.object({
        user_ids: z.array(z.number()).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      //@ts-ignore

      const where: Prisma.TransactionMatchWhereInput = {};

      if (input.user_ids && input.user_ids.length > 0) {
        where.userId = { in: input.user_ids };
      }

      if (input.startDate && input.endDate) {
        where.createdAt = {
          gte: new Date(input.startDate),
          lte: new Date(input.endDate),
        };
      }
      //@ts-ignore

      const matches = await ctx.db.transactionMatch.findMany({
        where,
        include: { P2PTransaction: true, GateTransaction: true },
        orderBy: { createdAt: "desc" },
      });

      return matches;
    }),

  getP2PTransactions: protectedProcedure
    .input(
      z.object({
        dateFrom: z.coerce.date(),
        dateTo: z.coerce.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        // Получаем все транзакции пользователя за указанный период
        const transactions = await ctx.db.p2PTransaction.findMany({
          where: {
            userId: ctx.user.id,
            completedAt: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          },
          orderBy: {
            completedAt: "desc",
          },
        });

        console.log(`Found ${transactions.length} P2P transactions`);

        return {
          success: true,
          transactions: transactions,
        };
      } catch (error) {
        console.error("Transaction fetch error:", error);
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch transactions",
        };
      }
    }),

  // src/server/api/routers/wallet.ts

  getTransactionStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const [unmatchedP2P, unmatchedGate, matches] = await Promise.all([
          // Непроматченные P2P транзакции
          ctx.db.p2PTransaction.count({
            where: {
              userId: ctx.user.id,
              completedAt: {
                gte: new Date(input.startDate),
                lte: new Date(input.endDate),
              },
              //@ts-ignore

              TransactionMatch: {
                none: {},
              },
            },
          }),
          // Непроматченные Gate транзакции
          ctx.db.gateTransaction.count({
            where: {
              userId: ctx.user.id,
              approvedAt: {
                gte: new Date(input.startDate),
                lte: new Date(input.endDate),
              },
              //@ts-ignore

              TransactionMatch: {
                none: {},
              },
            },
          }),
          // Получаем все матчи для расчета прибыли
          //@ts-ignore
          //
          ctx.db.transactionMatch.findMany({
            where: {
              userId: ctx.user.id,
              createdAt: {
                gte: new Date(input.startDate),
                lte: new Date(input.endDate),
              },
            },
            include: {
              P2PTransaction: true,
              GateTransaction: true,
            },
          }),
        ]);

        // Расчет общей прибыли
        const totalProfit = matches.reduce((sum, match) => {
          return (
            sum +
            Math.abs(
              match.P2PTransaction.amount - match.GateTransaction.amountUsdt,
            )
          );
        }, 0);

        return {
          unmatchedP2P,
          unmatchedGate,
          totalProfit,
          matchesCount: matches.length,
        };
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to fetch stats",
        );
      }
    }),

  // Модифицируем существующий endpoint getMatches для поиска по всем полям
  getMatches: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        startDate: z.string(),
        endDate: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        //@ts-ignore

        const matches = await ctx.db.transactionMatch.findMany({
          where: {
            userId: ctx.user.id,
            createdAt: {
              gte: new Date(input.startDate),
              lte: new Date(input.endDate),
            },
            OR: input.search
              ? [
                  {
                    P2PTransaction: {
                      OR: [
                        {
                          buyerName: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          method: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          telegramId: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                  {
                    GateTransaction: {
                      OR: [
                        {
                          wallet: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          bankName: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          bankLabel: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                        {
                          traderName: {
                            contains: input.search,
                            mode: "insensitive",
                          },
                        },
                      ],
                    },
                  },
                ]
              : undefined,
          },
          include: {
            P2PTransaction: true,
            GateTransaction: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return matches;
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Failed to fetch matches",
        );
      }
    }),

  setTelegramAuthToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Очищаем токен от всех пробелов и переносов строк
        const cleanToken = input.token.replace(/\s+/g, "").trim();
        console.log("Clean token length:", cleanToken.length);

        // Сохраняем токен
        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.user.id },
          data: { tgAuthToken: cleanToken },
          select: {
            id: true,
            tgAuthToken: true,
          },
        });

        if (!updatedUser.tgAuthToken) {
          console.error("Token was not saved");
          throw new Error("Failed to save token");
        }

        console.log("Token successfully saved for user:", ctx.user.id);

        return {
          success: true,
          message: "Token successfully saved",
        };
      } catch (error) {
        console.error("Token setting error:", error);
        throw error instanceof Error
          ? error
          : new Error("Unknown error while setting token");
      }
    }),
});
