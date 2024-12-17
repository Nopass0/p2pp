import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import axios from "axios";

export const walletRouter = createTRPCRouter({
  getTransactions: protectedProcedure
    .input(
      z.object({
        address: z.string(),
      }),
    )
    .query(async ({ input }) => {
      try {
        // Здесь будет логика получения транзакций с TON API
        // Пример использования toncenter API или другого провайдера
        const response = await axios.get(
          `https://testnet.toncenter.com/api/v2/getTransactions?address=${input.address}&limit=50`,
        );

        return {
          success: true,
          transactions: response.data.result,
        };
      } catch (error) {
        return {
          success: false,
          error: "Failed to fetch transactions",
        };
      }
    }),
});
