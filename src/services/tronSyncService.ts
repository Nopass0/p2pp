import { PrismaClient } from "@prisma/client";
import axios from "axios";

const TRON_MULTI_SEARCH_API_URL =
  "https://apilist.tronscanapi.com/api/multi/search";
const UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes

interface TronTransaction {
  contractRet: string;
  amount: string;
  date_created: number;
  methodName: string;
  methodId: string;
  to_address: string;
  revert: boolean;
  confirmed: boolean;
  tokenInfo: {
    tokenId: string;
    tokenAbbr: string;
    tokenName: string;
    tokenDecimal: number;
    tokenCanShow: number;
    tokenType: string;
    tokenLogo: string;
    tokenLevel: string;
    issuerAddr: string;
    vip: boolean;
  };
  token_id: string;
  block: number;
  riskTransaction: boolean;
  from_address: string;
  hash: string;
  fromAddressTag?: string; // Поле может отсутствовать
}

interface TronMultiSearchResponse {
  total: number;
  rangeTotal: number;
  data: TronTransaction[];
  contractMap: Record<string, boolean>;
  contractInfo: Record<string, unknown>;
  normalAddressInfo: Record<string, { risk: boolean }>;
}

async function fetchTransactions(address: string) {
  const now = Date.now();
  const startTime = now - 30 * 24 * 60 * 60 * 1000; // Last 30 days

  try {
    console.log(
      `Fetching transactions for ${address} from ${new Date(
        startTime,
      )} to ${new Date(now)}`,
    );

    const response = await axios.get<TronMultiSearchResponse>(
      TRON_MULTI_SEARCH_API_URL,
      {
        params: {
          limit: 50,
          start: 0,
          type: "transfer",
          secondType: 20,
          start_timestamp: startTime,
          end_timestamp: now,
          fromAddress: address,
          toAddress: address,
          relation: "or",
        },
      },
    );

    if (response.data.data) {
      console.log(
        `Found ${response.data.data.length} transactions for ${address}`,
      );
      return response.data.data;
    }

    console.log("No transactions found in response:", response.data);
    return [];
  } catch (error) {
    console.error(`Error fetching transactions for address ${address}:`, error);
    if (axios.isAxiosError(error)) {
      console.error("Response data:", error.response?.data);
    }
    throw error;
  }
}

export async function startTronSyncService(prisma: PrismaClient) {
  console.log("Starting Tron sync service...");

  async function syncWallet(walletId: number, userId: number, address: string) {
    try {
      console.log(
        `Starting sync for wallet ${address} (ID: ${walletId}, User: ${userId})`,
      );
      const transactions = await fetchTransactions(address);

      for (const tx of transactions) {
        if (tx.contractRet !== "SUCCESS") {
          console.log(`Skipping failed transaction ${tx.hash}`);
          continue;
        }

        try {
          // Определяем направление транзакции
          const isIncoming =
            tx.to_address.toLowerCase() === address.toLowerCase();

          console.log(`Processing transaction ${tx.hash}:`, {
            fromAddress: tx.from_address,
            toAddress: tx.to_address,
            amount: tx.amount,
            tokenInfo: tx.tokenInfo,
            direction: isIncoming ? "incoming" : "outgoing",
          });

          await prisma.tronTransaction.upsert({
            where: { hash: tx.hash },
            create: {
              userId,
              walletId,
              hash: tx.hash,
              fromAddress: tx.from_address,
              toAddress: tx.to_address,
              amount: tx.amount,
              tokenDecimal: tx.tokenInfo.tokenDecimal,
              tokenSymbol: tx.tokenInfo.tokenAbbr,
              tokenName: tx.tokenInfo.tokenName,
              methodName: tx.methodName,
              confirmed: tx.confirmed,
              timestamp: new Date(tx.date_created),
            },
            update: {
              confirmed: tx.confirmed,
            },
          });
          console.log(`Processed transaction ${tx.hash}`);
        } catch (error) {
          console.error(`Error processing transaction ${tx.hash}:`, error);
        }
      }

      console.log(
        `Successfully synced ${transactions.length} transactions for wallet ${address}`,
      );
    } catch (error) {
      console.error(`Error syncing wallet ${address}:`, error);
    }
  }

  async function syncAllWallets() {
    try {
      const wallets = await prisma.tronWallet.findMany({
        where: { isActive: true },
        select: {
          id: true,
          userId: true,
          address: true,
        },
      });

      console.log(`Found ${wallets.length} active Tron wallets to sync`);

      for (const wallet of wallets) {
        await syncWallet(wallet.id, wallet.userId, wallet.address);
      }
    } catch (error) {
      console.error("Error in sync cycle:", error);
    }
  }

  // Начальная синхронизация
  await syncAllWallets();

  // Запуск периодической синхронизации
  setInterval(syncAllWallets, UPDATE_INTERVAL);
}
