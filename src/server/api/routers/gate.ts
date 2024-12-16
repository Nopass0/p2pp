import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import axios from "axios";

// Gate API Constants
const GATE_API_URL = 'https://panel.gate.cx/api/v1/payments/payouts';
const GATE_BALANCE_URL = 'https://panel.gate.cx/api/v1/auth/me';
const GATE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchBalances(cookies: string) {
  try {
    console.log('Fetching Gate balances...');
    const response = await axios.get(GATE_BALANCE_URL, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'User-Agent': GATE_USER_AGENT
      }
    });

    const wallets = response.data?.response?.user?.wallets || [];
    const usdtWallet = wallets.find(w => w.currency.iso_code === '000001');
    const rubWallet = wallets.find(w => w.currency.iso_code === '643');

    return {
      usdt: usdtWallet?.balance || '0',
      rub: rubWallet?.balance || '0'
    };
  } catch (error) {
    console.error('Error fetching Gate balances:', error);
    return { usdt: '0', rub: '0' };
  }
}

async function fetchPayments(cookies: string) {
  try {
    console.log('Fetching Gate payments...');
    const queryParams = new URLSearchParams({
      'filters[status][]': ['2', '3', '7', '8', '9'].join(','),
      'page': '1'
    });
    
    const balances = await fetchBalances(cookies);
    const response = await axios.get(`${GATE_API_URL}?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': cookies,
        'User-Agent': GATE_USER_AGENT
      }
    });

    const items = response.data?.response?.payouts?.data;
    if (!Array.isArray(items)) {
      throw new Error('Invalid response format - items not found');
    }

    return items.map(item => ({
      ...item,
      currentBalances: balances
    }));
  } catch (error) {
    console.error('Error fetching Gate payments:', error);
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Неверные куки. Пожалуйста, обновите их.",
      });
    }
    throw error;
  }
}

export const gateRouter = createTRPCRouter({
  saveCookies: protectedProcedure
    .input(z.object({ cookies: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Проверяем куки
        await fetchBalances(input.cookies);
        
        // Ищем существующие куки для пользователя
        const existingCookie = await ctx.db.gateCookie.findFirst({
          where: { userId: ctx.user.id }
        });

        // Обновляем или создаем куки
        if (existingCookie) {
          await ctx.db.gateCookie.update({
            where: { id: existingCookie.id },
            data: {
              cookie: input.cookies,
              isActive: true,
              lastChecked: new Date(),
            },
          });
        } else {
          await ctx.db.gateCookie.create({
            data: {
              userId: ctx.user.id,
              cookie: input.cookies,
              isActive: true,
            },
          });
        }

        // Получаем и сохраняем начальные данные
        const payments = await fetchPayments(input.cookies);
        
        // Сохраняем транзакции
        for (const payment of payments) {
          const transactionId = payment.id.toString();
          const existingTransaction = await ctx.db.gateTransaction.findUnique({
            where: { transactionId },
          });

          if (existingTransaction) {
            await ctx.db.gateTransaction.update({
              where: { id: existingTransaction.id },
              data: {
                status: payment.status,
                bankName: payment.bank?.name,
                bankLabel: payment.bank?.label,
                paymentMethod: payment.method?.label,
                course: payment.meta?.courses?.trader,
                successCount: payment.tooltip?.payments?.success,
                successRate: payment.tooltip?.payments?.percent,
                usdtBalance: payment.currentBalances?.usdt,
                rubBalance: payment.currentBalances?.rub,
                approvedAt: payment.approved_at ? new Date(payment.approved_at) : null,
                expiredAt: payment.expired_at ? new Date(payment.expired_at) : null,
                updatedAt: new Date(),
              },
            });
          } else {
            await ctx.db.gateTransaction.create({
              data: {
                userId: ctx.user.id,
                transactionId,
                paymentMethodId: payment.payment_method_id,
                wallet: payment.wallet,
                amountRub: payment.amount.trader['643'],
                amountUsdt: payment.amount.trader['000001'],
                totalRub: payment.total.trader['643'],
                totalUsdt: payment.total.trader['000001'],
                status: payment.status,
                bankName: payment.bank?.name,
                bankLabel: payment.bank?.label,
                paymentMethod: payment.method?.label,
                course: payment.meta?.courses?.trader,
                successCount: payment.tooltip?.payments?.success,
                successRate: payment.tooltip?.payments?.percent,
                usdtBalance: payment.currentBalances?.usdt,
                rubBalance: payment.currentBalances?.rub,
                approvedAt: payment.approved_at ? new Date(payment.approved_at) : null,
                expiredAt: payment.expired_at ? new Date(payment.expired_at) : null,
                createdAt: new Date(payment.created_at),
              },
            });
          }
        }

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        
        console.error('Error saving Gate cookies:', error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Не удалось проверить куки. Убедитесь, что они действительны.",
        });
      }
    }),

  getTransactions: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const transactions = await ctx.db.gateTransaction.findMany({
          where: {
            userId: ctx.user.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return transactions;
      } catch (error) {
        console.error('Error getting transactions:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Не удалось получить транзакции",
        });
      }
    }),
});