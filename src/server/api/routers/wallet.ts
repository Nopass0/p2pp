// p2pp/src/server/api/routers/wallet.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import axios from "axios";
import { sendTelegramMessage } from "@/services/telegramBotService";
import { env } from "@/env";
import { type PrismaClient } from "@prisma/client";
import { db } from "@/server/db";

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
        // 1. Получаем текущего пользователя
        const user = await ctx.db.user.findUnique({
          where: { id: ctx.user.id },
        });

        if (!user || !user.tgAuthToken) {
          return {
            success: false,
            error: "User not found or no Telegram token",
          };
        }

        // 2. Синхронизируем свежие данные из API
        try {
          const response = await axios.get(
            "https://walletbot.me/api/v1/transactions/",
            {
              params: { limit: 100 }, // Увеличиваем лимит для получения большего количества транзакций
              headers: { Authorization: user.tgAuthToken },
              timeout: 10000,
            },
          );

          if (response.data?.transactions) {
            // Сохраняем все полученные транзакции
            for (const tx of response.data.transactions) {
              await ctx.db.telegramTransaction.upsert({
                where: { transactionId: tx.id },
                update: {
                  type: tx.type,
                  updatedAt: new Date(),
                  amount: parseFloat(tx.amount),
                  currency: tx.currency,
                  status: tx.status,
                  gateway: tx.gateway,
                  username: tx.username,
                  tg_id: tx.tg_id?.toString(),
                  input_addresses: tx.input_addresses,
                  recipient_wallet_address: tx.recipient_wallet_address,
                  activated_amount: tx.activated_amount
                    ? parseFloat(tx.activated_amount)
                    : null,
                  photo_url: tx.photo_url,
                  details_for_user: tx.details_for_user,
                  pair_transaction_currency: tx.pair_transaction_currency,
                  is_blocked: tx.is_blocked ?? false,
                  network: tx.network,
                  cryptocurrency_exchange: tx.cryptocurrency_exchange,
                },
                create: {
                  userId: user.id,
                  transactionId: tx.id,
                  type: tx.type,
                  createdAt: new Date(tx.created_at),
                  updatedAt: new Date(),
                  amount: parseFloat(tx.amount),
                  currency: tx.currency,
                  status: tx.status,
                  gateway: tx.gateway,
                  username: tx.username,
                  tg_id: tx.tg_id?.toString(),
                  input_addresses: tx.input_addresses,
                  recipient_wallet_address: tx.recipient_wallet_address,
                  activated_amount: tx.activated_amount
                    ? parseFloat(tx.activated_amount)
                    : null,
                  photo_url: tx.photo_url,
                  details_for_user: tx.details_for_user,
                  pair_transaction_currency: tx.pair_transaction_currency,
                  is_blocked: tx.is_blocked ?? false,
                  network: tx.network,
                  cryptocurrency_exchange: tx.cryptocurrency_exchange,
                },
              });
            }

            // Если есть следующая страница, загружаем и её
            if (response.data.next) {
              const nextCursor = new URL(response.data.next).searchParams.get(
                "cursor",
              );
              if (nextCursor) {
                await syncTelegramTransactionsForUser(
                  ctx.db,
                  user.id,
                  parseInt(nextCursor),
                );
              }
            }
          }
        } catch (error) {
          console.error("Error syncing with Telegram API:", error);
          // Продолжаем выполнение даже при ошибке API, чтобы вернуть хотя бы существующие данные
        }

        // 3. Получаем обновленные данные из базы
        const transactions = await ctx.db.telegramTransaction.findMany({
          where: {
            userId: ctx.user.id,
            OR: [
              { gateway: "p2p_offer" },
              { gateway: "top_up" },
              { gateway: "withdraw_onchain" },
            ],
            createdAt: {
              gte: input.dateFrom,
              lte: input.dateTo,
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        return {
          success: true,
          transactions,
        };
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        return {
          success: false,
          error: "Failed to fetch transactions",
        };
      }
    }),

  setTelegramAuthToken: protectedProcedure
    .input(
      z.object({
        token: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Проверяем валидность токена
        const checkResponse = await axios.get(
          "https://walletbot.me/api/v1/transactions/",
          {
            params: { limit: 1 },
            headers: { Authorization: input.token },
          },
        );

        if (!checkResponse.data) {
          throw new Error("Invalid token");
        }

        const updatedUser = await ctx.db.user.update({
          where: { id: ctx.user.id },
          //@tg-ignore
          data: { tgAuthToken: input.token },
        });

        // Запускаем немедленную синхронизацию после обновления токена
        await syncTelegramTransactionsForUser(ctx.db, updatedUser.id);

        return {
          success: true,
          message: "Telegram auth token set successfully",
        };
      } catch (error) {
        console.error("Failed to set Telegram auth token:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to set token",
        };
      }
    }),
});

async function syncTelegramTransactionsForUser(
  prisma: PrismaClient,
  userId: number,
  cursor?: number,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  //@tg-ignore
  if (!user?.tgAuthToken) return;

  try {
    const response = await axios.get(
      "https://walletbot.me/api/v1/transactions/",
      {
        params: { limit: 50, cursor },
        //@tg-ignore
        headers: { Authorization: user.tgAuthToken },
        timeout: 10000, // Добавляем таймаут
      },
    );

    if (!response.data?.transactions) {
      console.error("No transactions data in response");
      return;
    }

    for (const tx of response.data.transactions) {
      //@tg-ignore
      await prisma.telegramTransaction.upsert({
        where: { transactionId: tx.id },
        update: {
          type: tx.type,
          updatedAt: new Date(),
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          status: tx.status,
          gateway: tx.gateway,
          username: tx.username,
          tg_id: tx.tg_id?.toString(),
          input_addresses: tx.input_addresses,
          recipient_wallet_address: tx.recipient_wallet_address,
          activated_amount: tx.activated_amount
            ? parseFloat(tx.activated_amount)
            : null,
          photo_url: tx.photo_url,
          details_for_user: tx.details_for_user,
          pair_transaction_currency: tx.pair_transaction_currency,
          is_blocked: tx.is_blocked ?? false,
          network: tx.network,
          cryptocurrency_exchange: tx.cryptocurrency_exchange,
        },
        create: {
          userId: user.id,
          transactionId: tx.id,
          type: tx.type,
          createdAt: new Date(tx.created_at),
          updatedAt: new Date(),
          amount: parseFloat(tx.amount),
          currency: tx.currency,
          status: tx.status,
          gateway: tx.gateway,
          username: tx.username,
          tg_id: tx.tg_id?.toString(),
          input_addresses: tx.input_addresses,
          recipient_wallet_address: tx.recipient_wallet_address,
          activated_amount: tx.activated_amount
            ? parseFloat(tx.activated_amount)
            : null,
          photo_url: tx.photo_url,
          details_for_user: tx.details_for_user,
          pair_transaction_currency: tx.pair_transaction_currency,
          is_blocked: tx.is_blocked ?? false,
          network: tx.network,
          cryptocurrency_exchange: tx.cryptocurrency_exchange,
        },
      });
    }

    // Рекурсивная загрузка следующей страницы
    if (response.data.next) {
      const nextCursor = new URL(response.data.next).searchParams.get("cursor");
      if (nextCursor) {
        await syncTelegramTransactionsForUser(
          prisma,
          userId,
          parseInt(nextCursor),
        );
      }
    }
  } catch (error) {
    if (
      axios.isAxiosError(error) &&
      error.response?.data?.code === "token_expired"
    ) {
      console.error(
        `Telegram token expired for user ${user.telegramId} (ID: ${user.id})`,
      );
      await prisma.user.update({
        where: { id: user.id },
        //@tg-ignore
        data: { tgAuthToken: null },
      });

      await sendTelegramMessage(
        user.telegramId,
        //@tg-ignore

        `Ваш токен Telegram истёк. Пожалуйста, обновите его по ссылке: ${env.NEXT_PUBLIC_APP_URL}`,
      );
    } else {
      console.error(
        `Error syncing Telegram transactions for user ${user.telegramId} (ID: ${user.id}):`,
        error,
      );
    }
  }
}

export async function startTelegramTransactionsSync(prisma: PrismaClient) {
  console.log("Starting Telegram transactions sync...");

  async function syncAllUsers() {
    try {
      const users = await prisma.user.findMany({
        //@tg-ignore
        where: {
          //@tg-ignore
          NOT: {
            //@tg-ignore
            tgAuthToken: null,
          },
        },
        select: { id: true },
      });

      console.log(`Found ${users.length} users with Telegram tokens to sync`);

      for (const user of users) {
        await syncTelegramTransactionsForUser(prisma, user.id);
      }
    } catch (error) {
      console.error("Error in Telegram sync cycle:", error);
    }
  }

  await syncAllUsers();

  // Запускаем синхронизацию каждые 5 минут
  setInterval(syncAllUsers, 5 * 60 * 1000);
}
