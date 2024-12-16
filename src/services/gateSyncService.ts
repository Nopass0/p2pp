import { PrismaClient } from "@prisma/client";
import axios from "axios";

// API Constants
const GATE_API_URL = 'https://panel.gate.cx/api/v1/payments/payouts';
const GATE_BALANCE_URL = 'https://panel.gate.cx/api/v1/auth/me';
const GATE_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Обновление каждые 5 минут
const UPDATE_INTERVAL = 5 * 60 * 1000;

// Interfaces
interface PaymentAmount {
  trader: {
    '643': number;
    '000001': number;
  };
}

interface GatePayment {
  id: number;
  payment_method_id: number;
  wallet: string;
  amount: PaymentAmount;
  total: PaymentAmount;
  status: number;
  approved_at: string | null;
  expired_at: string | null;
  created_at: string;
  meta: {
    courses: {
      trader: number;
    };
  };
  method: {
    label: string;
  };
  bank: {
    name: string;
    label: string;
  };
  tooltip: {
    payments: {
      success: number;
      rejected: number | null;
      percent: number;
    };
  };
  currentBalances?: {
    usdt: string;
    rub: string;
  };
}

async function fetchBalances(cookies: string) {
  try {
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
    throw error;
  }
}

export async function startGateSyncService(prisma: PrismaClient) {
  console.log('Starting Gate sync service...');

  async function syncUser(userId: number, cookies: string) {
    try {
      console.log(`Syncing Gate data for user ${userId}...`);
      const payments = await fetchPayments(cookies);

      // Сохраняем транзакции
      for (const payment of payments) {
        await prisma.gateTransaction.upsert({
          where: {
            transactionId: payment.id.toString(),
          },
          update: {
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
          create: {
            userId: userId,
            transactionId: payment.id.toString(),
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

      // Обновляем время последней проверки куки
      await prisma.gateCookie.update({
        where: {
          userId: userId,
        },
        data: {
          lastChecked: new Date(),
        },
      });

      console.log(`Successfully synced ${payments.length} transactions for user ${userId}`);
    } catch (error) {
      console.error(`Error syncing Gate data for user ${userId}:`, error);

      // Если произошла ошибка авторизации, деактивируем куки
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await prisma.gateCookie.update({
          where: {
            userId: userId,
          },
          data: {
            isActive: false,
          },
        });
      }
    }
  }

  async function syncAllUsers() {
    try {
      // Получаем все активные куки
      const cookies = await prisma.gateCookie.findMany({
        where: {
          isActive: true,
        },
        select: {
          userId: true,
          cookie: true,
        }
      });

      console.log(`Found ${cookies.length} active Gate cookies`);

      // Синхронизируем данные для каждого пользователя
      await Promise.allSettled(
        cookies.map(cookie => syncUser(cookie.userId, cookie.cookie))
      );
    } catch (error) {
      console.error('Error in Gate sync cycle:', error);
    }
  }

  // Запускаем первую синхронизацию
  await syncAllUsers();

  // Запускаем периодическую синхронизацию
  setInterval(syncAllUsers, UPDATE_INTERVAL);
}