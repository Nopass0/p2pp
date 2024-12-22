// src/server/api/routers/wallet.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import axios from "axios";
import { env } from "@/env";
import { type PrismaClient } from "@prisma/client";

export const walletRouter = createTRPCRouter({
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
            completedAt: 'desc',
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
          error: error instanceof Error ? error.message : "Failed to fetch transactions",
        };
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

        // Пробуем сделать тестовый запрос с токеном
        try {
          const testResponse = await axios.get(
            "https://panel.gate.cx/api/v1/payments/payouts",
            {
              headers: {
                Authorization: cleanToken,
                Accept: "application/json",
                "Content-Type": "application/json",
              },
              validateStatus: (status) => status < 500,
            },
          );

          if (testResponse.status === 401) {
            console.log("Token validation failed: 401 Unauthorized");
            throw new Error("Token validation failed: unauthorized");
          }

          if (!testResponse.data) {
            console.log("Token validation failed: no data in response");
            throw new Error("Token validation failed: no data");
          }
        } catch (apiError) {
          console.error("API test request failed:", apiError);

          if (axios.isAxiosError(apiError)) {
            if (apiError.response?.status === 401) {
              throw new Error("Invalid or expired token");
            }
            if (apiError.code === "ECONNABORTED") {
              throw new Error("Connection timeout. Please try again");
            }
            throw new Error(`API error: ${apiError.message}`);
          }

          throw new Error("Failed to validate token");
        }

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
