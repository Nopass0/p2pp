// p2pp/src/server/api/routers/wallet.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import axios from "axios";
import { sendTelegramMessage } from "@/services/telegramBotService";
import { env } from "@/env";
import { type PrismaClient } from "@prisma/client";
import { db } from "@/server/db";

// Типы для транзакций
interface TelegramTransaction {
  id: number;
  type: string;
  created_at: string;
  updated_at: string;
  amount: string;
  currency: string;
  status: string;
  gateway: string;
  username?: string;
  tg_id?: string;
  input_addresses?: string;
  recipient_wallet_address?: string;
  activated_amount?: string;
  photo_url?: string;
  details_for_user?: string;
  pair_transaction_currency?: string;
  is_blocked?: boolean;
  network?: string;
  cryptocurrency_exchange?: string;
}

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
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.user.id },
          select: {
            id: true,
            tgAuthToken: true,
          },
        });

        if (!user?.tgAuthToken) {
          console.log("No token found for user:", ctx.user.id);
          return {
            success: false,
            error: "No Telegram token found",
          };
        }

        const cleanToken = user.tgAuthToken.replace(/[\r\n]+/g, "").trim();
        console.log("Token length after cleaning:", cleanToken.length);

        try {
          const response = await axios.get<{
            transactions: TelegramTransaction[];
            next?: string;
          }>("https://walletbot.me/api/v1/transactions/", {
            params: { limit: 100 },
            headers: { Authorization: cleanToken },
            timeout: 10000,
          });

          if (!response.data?.transactions) {
            console.log("No transactions in API response");
            return {
              success: false,
              error: "No transactions found",
            };
          }

          const filteredTransactions = response.data.transactions
            .filter((tx) => {
              const txDate = new Date(tx.created_at);
              return (
                txDate >= input.dateFrom &&
                txDate <= input.dateTo &&
                ["p2p_offer", "top_up", "withdraw_onchain"].includes(tx.gateway)
              );
            })
            .map((tx) => ({
              id: tx.id,
              transactionId: tx.id,
              type: tx.type,
              createdAt: new Date(tx.created_at),
              updatedAt: new Date(tx.updated_at),
              amount: parseFloat(tx.amount),
              currency: tx.currency,
              status: tx.status,
              gateway: tx.gateway,
              username: tx.username || null,
              tg_id: tx.tg_id?.toString() || null,
              input_addresses: tx.input_addresses || null,
              recipient_wallet_address: tx.recipient_wallet_address || null,
              activated_amount: tx.activated_amount
                ? parseFloat(tx.activated_amount)
                : null,
              photo_url: tx.photo_url || null,
              details_for_user: tx.details_for_user || null,
              pair_transaction_currency: tx.pair_transaction_currency || null,
              is_blocked: tx.is_blocked || false,
              network: tx.network || null,
              cryptocurrency_exchange: tx.cryptocurrency_exchange || null,
            }))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

          console.log(`Found ${filteredTransactions.length} transactions`);

          return {
            success: true,
            transactions: filteredTransactions,
          };
        } catch (apiError) {
          console.error("API Error:", apiError);

          if (
            axios.isAxiosError(apiError) &&
            apiError.response?.status === 401
          ) {
            await ctx.db.user.update({
              where: { id: ctx.user.id },
              data: { tgAuthToken: null },
            });
            return {
              success: false,
              error: "Token expired or invalid",
            };
          }

          throw apiError;
        }
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

  setTelegramAuthToken: protectedProcedure
    .input(
      z.object({
        token: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const cleanToken = input.token.replace(/[\r\n]+/g, "").trim();
        console.log("Setting new token, length:", cleanToken.length);

        // Проверяем токен
        try {
          const checkResponse = await axios.get(
            "https://walletbot.me/api/v1/transactions/",
            {
              params: { limit: 1 },
              headers: { Authorization: cleanToken },
              timeout: 5000,
            },
          );

          if (!checkResponse.data) {
            console.log("Token validation failed: no data in response");
            throw new Error("Invalid token");
          }
        } catch (checkError) {
          console.error("Token validation failed:", checkError);
          throw new Error(
            axios.isAxiosError(checkError) &&
            checkError.response?.status === 401
              ? "Invalid token"
              : "Failed to validate token",
          );
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
          throw new Error("Token was not saved");
        }

        console.log("Token saved successfully");

        return {
          success: true,
          message: "Telegram auth token set successfully",
        };
      } catch (error) {
        console.error("Token setting error:", error);
        throw error;
      }
    }),
});

// Вспомогательные функции (если нужны)
function formatTransaction(tx: TelegramTransaction) {
  return {
    id: tx.id,
    transactionId: tx.id,
    type: tx.type,
    createdAt: new Date(tx.created_at),
    updatedAt: new Date(tx.updated_at),
    amount: parseFloat(tx.amount),
    currency: tx.currency,
    status: tx.status,
    gateway: tx.gateway,
    username: tx.username || null,
    tg_id: tx.tg_id?.toString() || null,
    input_addresses: tx.input_addresses || null,
    recipient_wallet_address: tx.recipient_wallet_address || null,
    activated_amount: tx.activated_amount
      ? parseFloat(tx.activated_amount)
      : null,
    photo_url: tx.photo_url || null,
    details_for_user: tx.details_for_user || null,
    pair_transaction_currency: tx.pair_transaction_currency || null,
    is_blocked: tx.is_blocked || false,
    network: tx.network || null,
    cryptocurrency_exchange: tx.cryptocurrency_exchange || null,
  };
}

export async function startTelegramTransactionsSync(prisma: PrismaClient) {
  console.log("Telegram sync service started");
}
