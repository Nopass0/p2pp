// src/server/api/routers/user.ts
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { type TronTransaction, type TronWallet } from "@prisma/client";
import { generateRandomString } from "@/lib/utils";

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

  startWork: protectedProcedure
    .input(
      z.object({
        //string or date, if string transform to date is error while transform get new Date() now
        startTime: z.union([z.string(), z.date()]).transform((arg) => new Date(arg)),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workTime = await ctx.db.workTime.create({
        data: {
          user: {
            connect: {
              id: ctx.user.id,
            },
          },
          duration: 0,
          startTime: input.startTime,
        },
      });
      return workTime;
    }),

  //get work time range in format hh:mm-hh:mm on currentDate, in string format, if not exist return "00:00-00:00"
  getWorkTime: protectedProcedure.query(async ({ ctx }) => {
    const workTime = await ctx.db.workTime.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
    
    if (!workTime) return "00:00-00:00";
    
    const startTimeStr = workTime.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = workTime.endTime 
      ? workTime.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : "00:00";
    
    return `${startTimeStr}-${endTimeStr}`;
  }),

  //get last work status is exist end datatime on last user's work, then return true
  isWorkDone: protectedProcedure.query(async ({ ctx }) => {
    const workTime = await ctx.db.workTime.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
    if (workTime.length === 0) return { isDone: true, lastWorkEndDateTime: null };
    return { isDone: workTime[0].endTime !== null, lastWorkEndDateTime: workTime[0].endTime };
  }),



  stopWork: protectedProcedure
    .input(
      z.object({
        reportContent: z.string(),
        files: z.array(z.object({
          filename: z.string().default(generateRandomString(16)),
          path: z.string(),
        })),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lastWork = await ctx.db.workTime.findFirst({
        where: { 
          userId: ctx.user.id,
          endTime: null,
        },
        orderBy: { startTime: 'desc' },
      });

      if (!lastWork) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active work session found',
        });
      }

      const endTime = new Date();
      const duration = (endTime.getTime() - lastWork.startTime.getTime()) / (1000 * 60 * 60); // in hours

      const updatedWork = await ctx.db.workTime.update({
        where: { id: lastWork.id },
        data: {
          endTime,
          duration,
          report: {
            create: {
              content: input.reportContent,
              files: {
                createMany: {
                  //@ts-ignore
                  data: input.files,
                },
              },
            },
          },
        },
        include: {
          report: {
            include: {
              files: true,
            },
          },
        },
      });

      return updatedWork;
    }),

  getWorkHistory: protectedProcedure.query(async ({ ctx }) => {
    const workHistory = await ctx.db.workTime.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startTime: 'desc' },
      include: {
        report: {
          include: {
            files: true,
          },
        },
      },
    });
    return workHistory;
  }),

  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    try {
      const users = await ctx.db.user.findMany({
        select: {
          id: true,
          firstName: true,
          lastName: true,
          telegramId: true,
          isAdmin: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      return users;
    } catch (error) {
      throw new Error("Failed to fetch users");
    }
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
  getTodayStats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all transactions for today
    const gateTransactions = await ctx.db.gateTransaction.findMany({
      where: {
        userId: ctx.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const p2pTransactions = await ctx.db.p2PTransaction.findMany({
      where: {
        userId: ctx.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const matchTransactions = await ctx.db.transactionMatch.count({
      where: {
        userId: ctx.user.id,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    // Расчет выручки
    const gateFee = 0.009; // 0.9%
    const gateRevenue = gateTransactions.reduce(
      (sum, tx) => sum + tx.amountUsdt * gateFee,
      0,
    );
    const p2pRevenue = p2pTransactions.reduce(
      (sum, tx) => sum + (tx.amount * tx.price - tx.totalRub) / tx.price,
      0,
    );
    const totalRevenue = gateRevenue + p2pRevenue;

    // Получаем процент комиссии сотрудника
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      select: { commissionRate: true },
    });
    const commissionRate = user?.commissionRate ?? 0.5; // По умолчанию 50%

    // Расчет зарплаты
    const salary = totalRevenue * commissionRate;

    return {
      matchCount: matchTransactions,
      gateRevenue,
      p2pRevenue,
      totalRevenue,
      salary,
      commissionRate,
    };
  }),

});
