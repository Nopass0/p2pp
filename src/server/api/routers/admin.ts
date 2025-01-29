import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";
import crypto from "crypto";
import { db } from "@/server/db";
import { evaluate } from "mathjs";

// Schema for date range inputs that accepts strings and converts them to dates when needed
const dateRangeInput = z.object({
  from: z.string(),
  to: z.string(),
});

// get string and transform to date
const dateRangeSchema = z.object({
  from: z.string().transform((arg) => new Date(arg)),
  to: z.string().transform((arg) => new Date(arg)),
});

const activateInput = z.object({
  key: z.string(),
});

const makeAdminInput = z.object({
  userId: z.number(),
});

const removeAdminInput = z.object({
  userId: z.number(),
});

const deleteUserInput = z.object({
  userId: z.number(),
});

const transactionCountInput = z.object({
  userId: z.number(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const userSearchInput = z.object({
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  isAdmin: z.boolean().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
  sortBy: z.string().optional(),
  sortDirection: z.enum(["asc", "desc"]).optional(),
  withPassport: z.boolean().optional(),
});

const getEmployeesInput = z.object({
  search: z.string().default(""),
  limit: z.number().default(10),
  dateRange: dateRangeSchema,
});

async function calculateWorkTime(
  db: PrismaClient,
  userId: number,
  startDate: Date,
  endDate: Date,
): Promise<number> {
  const transactions = await db.transactionMatch.findMany({
    where: {
      userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  if (!transactions || transactions.length === 0) return 0;
  
  const validTransactions = transactions.filter(tx => tx && tx.createdAt);
  if (validTransactions.length === 0) return 0;
  
  const first = validTransactions[0].createdAt.getTime();
  const last = validTransactions[validTransactions.length - 1].createdAt.getTime();
  return (last - first) / (1000 * 60); // в минутах
}

function calculateGrossProfit(
  gateTransactions: GateTransaction[],
  p2pTransactions: P2PTransaction[],
): number {
  const commission = 1.009;
  const totalGate = gateTransactions.reduce((sum, tx) => sum + tx.totalUsdt, 0);
  const totalP2P = p2pTransactions.reduce(
    (sum, tx) => sum + tx.amount * commission,
    0,
  );
  return totalGate - totalP2P;
}

export const adminRouter = createTRPCRouter({
  getOverallMetrics: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      const gateTransactions = await ctx.db.gateTransaction.findMany({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      });

      const p2pTransactions = await ctx.db.p2PTransaction.findMany({
        where: {
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      });

      const totalOrders = gateTransactions.length + p2pTransactions.length;
      const totalRevenue = calculateEmployeeRevenue(gateTransactions, p2pTransactions);
      const totalExpenses = await calculateTotalExpenses([], { from, to });
      const grossProfit = totalRevenue - totalExpenses;
      const averageOrderAmount = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const averageOrderProfit = totalOrders > 0 ? grossProfit / totalOrders : 0;

      return {
        totalRevenue,
        totalExpenses,
        grossProfit,
        grossProfitPercentage: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        averageOrderAmount,
        averageOrderProfit,
        totalOrders,
      };
    }),

  updateEmployee: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        middleName: z.string().optional(),
        passportPhoto: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId, ...data } = input;
      return await db.user.update({
        where: { id: userId },
        data,
      });
    }),

  getEmployees: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        dateRange: z.object({
          from: z.string(),
          to: z.string(),
        }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where = {
          ...(input.search
            ? {
                OR: [
                  { firstName: { contains: input.search, mode: "insensitive" } },
                  { lastName: { contains: input.search, mode: "insensitive" } },
                ],
              }
            : {}),
        };

        const users = await ctx.db.user.findMany({
          where,
          take: input.limit,
          skip: input.offset,
          include: {
            comments: {
              orderBy: { createdAt: 'desc' },
              include: {
                author: true
              }
            },
            employeeExpenses: true,
            workTime: {
              orderBy: { startTime: 'desc' },
              take: 1,
              include: {
                report: true
              }
            }
          }
        });

        const dateRange = input.dateRange
          ? {
              from: new Date(input.dateRange.from),
              to: new Date(input.dateRange.to),
            }
          : undefined;

        const employeeData = await Promise.all(
          users.map(async (user) => {
            const [p2pTransactions, gateTransactions, matchTransactions] = await Promise.all([
              ctx.db.p2PTransaction.findMany({
                where: {
                  userId: user.id,
                  ...(dateRange
                    ? {
                        createdAt: {
                          gte: dateRange.from,
                          lte: dateRange.to,
                        },
                      }
                    : {}),
                },
              }),
              ctx.db.gateTransaction.findMany({
                where: {
                  userId: user.id,
                  ...(dateRange
                    ? {
                        createdAt: {
                          gte: dateRange.from,
                          lte: dateRange.to,
                        },
                      }
                    : {}),
                },
              }),
              ctx.db.transactionMatch.count({
                where: {
                  userId: user.id,
                  ...(dateRange
                    ? {
                        createdAt: {
                          gte: dateRange.from,
                          lte: dateRange.to,
                        },
                      }
                    : {}),
                },
              }),
            ]);

            // Calculate gross profit
            const grossProfit = calculateEmployeeRevenue(gateTransactions, p2pTransactions);
            const salary = grossProfit * (user.salaryPercentage || 0);

            return {
              ...user,
              p2pTransactions: p2pTransactions.length,
              gateTransactions: gateTransactions.length,
              matchTransactions,
              lastWorkTime: user.workTime[0],
              grossProfit,
              salary
            };
          }),
        );

        return employeeData;
      } catch (error) {
        console.error("Error in getEmployees:", error);
        throw error;
      }
    }),

  updateCommissionRate: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        rate: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { employeeId, rate } = input;

      const updatedUser = await db.user.update({
        where: { id: employeeId },
        data: { commissionRate: rate },
      });

      return updatedUser;
    }),

  getEmployeeDetails: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        dateRange: dateRangeInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { employeeId } = input;
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      const employee = await db.user.findUnique({
        where: { id: employeeId },
        include: {
          gateTransactions: {
            where: {
              createdAt: { gte: from, lte: to },
              status: 1, // Assuming 1 means completed
            },
          },
          P2PTransaction: {
            where: {
              completedAt: { gte: from, lte: to },
              status: "completed",
            },
          },
          UserSession: {
            where: {
              startTime: { gte: from, lte: to },
            },
          },
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      const workTime = await calculateWorkTime(ctx.db, employeeId, from, to);
      const ordersCount =
        employee.gateTransactions.length + employee.P2PTransaction.length;
      const revenue = calculateEmployeeRevenue(
        employee.gateTransactions,
        employee.P2PTransaction,
      );
      const weightedSpread = calculateWeightedSpread(
        employee.gateTransactions,
        employee.P2PTransaction,
      );

      return {
        id: employee.id,
        name:
          //@ts-ignore

          `${employee.firstName} ${employee.lastName}`.trim() ||
          employee.username ||
          "Unknown",
        telegramId: employee.telegramId || "N/A",
        gateId: employee.telegramId, // Assuming Gate ID is the same as Telegram ID
        workTime,
        ordersCount,
        revenue,
        weightedSpread,
        salaryPercentage: await getEmployeeSalaryPercentage(employeeId),
        initialBalance: await getEmployeeInitialBalance(employeeId),
      };
    }),

  getEmployeeTransactions: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        dateRange: dateRangeInput,
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { employeeId } = input;
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      const [gateTransactions, p2pTransactions] = await Promise.all([
        db.gateTransaction.findMany({
          where: {
            userId: employeeId,
            createdAt: { gte: from, lte: to },
            OR: input.search
              ? [
                  { transactionId: { contains: input.search, mode: "insensitive" } },
                  { wallet: { contains: input.search, mode: "insensitive" } },
                ]
              : undefined,
          },
          orderBy: { createdAt: "desc" },
        }),
        db.p2PTransaction.findMany({
          where: {
            userId: employeeId,
            completedAt: { gte: from, lte: to },
            OR: input.search
              ? [
                  { telegramId: { contains: input.search, mode: "insensitive" } },
                  { buyerName: { contains: input.search, mode: "insensitive" } },
                ]
              : undefined,
          },
          orderBy: { completedAt: "desc" },
        }),
      ]);

      const transactions = [
        ...gateTransactions.map((tx) => ({
          id: tx.id,
          type: "Gate",
          amount: tx.amountUsdt,
          currency: "USDT",
          status: tx.status === 1 ? "completed" : "pending",
          createdAt: tx.createdAt,
        })),
        ...p2pTransactions.map((tx) => ({
          id: tx.id,
          type: "P2P",
          amount: tx.amount,
          currency: "USDT",
          status: tx.status,
          createdAt: tx.completedAt,
        })),
        //@ts-ignore
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return transactions;
    }),

  updateSalaryPercentage: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        percentage: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { employeeId, percentage } = input;

      await db.user.update({
        where: { id: employeeId },
        //@ts-ignore

        data: { salaryPercentage: percentage },
      });

      return { success: true };
    }),

  updateInitialBalance: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        balance: z.number().min(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { employeeId, balance } = input;

      await db.user.update({
        where: { id: employeeId },
        //@ts-ignore

        data: { initialBalance: balance },
      });

      return { success: true };
    }),

  updateGatePercentage: adminProcedure
    .input(
      z.object({
        percentage: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { percentage } = input;
      //@ts-ignore

      await db.settings.upsert({
        where: { key: "gatePercentage" },
        //@ts-ignore

        update: { value: percentage.toString() },
        //@ts-ignore

        create: { key: "gatePercentage", value: percentage.toString() },
      });

      return { success: true };
    }),

  updateCommissionRate: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        rate: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { employeeId, rate } = input;

      await db.user.update({
        where: { id: employeeId },
        //@ts-ignore

        data: { commissionRate: rate },
      });

      return { success: true };
    }),

  calculateProfit: adminProcedure
    .input(
      z.object({
        dateRange: dateRangeInput,
        expenses: z.array(
          z.object({
            name: z.string(),
            amount: z.number(),
            isRecurring: z.boolean(),
            period: z.string().optional(),
          }),
        ),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      const revenue = await calculateTotalRevenue(from, to);
      const totalExpenses = calculateTotalExpenses(input.expenses, { from, to });
      const netProfit = revenue - totalExpenses;

      return {
        revenue,
        expenses: totalExpenses,
        netProfit,
      };
    }),

  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    return await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        telegramId: true,
        username: true,
        firstName: true,
        lastName: true,
        photoUrl: true,
        isAdmin: true,
        createdAt: true,
      },
    });
  }),

  activateAdmin: protectedProcedure
    .input(activateInput)
    .mutation(async ({ ctx, input }) => {
      if (input.key !== env.INIT_ADMIN_KEY) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid admin key",
        });
      }

      const user = await db.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (user.isAdmin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already an admin",
        });
      }

      const updatedUser = await db.user.update({
        where: { id: user.id },
        //@ts-ignore

        data: { isAdmin: true },
      });

      await db.adminAction.create({
        //@ts-ignore

        data: {
          userId: user.id,
          action: "ADMIN_ACTIVATION",
          target: "User activated admin privileges",
        },
      });

      return { success: true };
    }),

  generateInviteCode: adminProcedure.mutation(async ({ ctx }) => {
    //@ts-ignore

    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    await db.adminInviteCode.create({
      //@ts-ignore

      data: {
        code,
        //@ts-ignore

        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    return { code };
  }),

  getActionLogs: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, startDate, endDate } = input;

      const where: any = {};
      if (startDate) where.createdAt = { gte: startDate };
      if (endDate) where.createdAt = { ...where.createdAt, lte: endDate };

      const items = await db.adminAction.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      let nextCursor: typeof input.cursor | undefined = undefined;
      //@ts-ignore

      if (items.length > limit) {
        //@ts-ignore

        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  makeAdmin: adminProcedure
    .input(makeAdminInput)
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      await db.user.update({
        where: { id: input.userId },
        //@ts-ignore

        data: { isAdmin: true },
      });

      return { success: true };
    }),

  removeAdmin: adminProcedure
    .input(removeAdminInput)
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      if (!user.isAdmin) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not an admin.",
        });
      }

      await db.user.update({
        where: { id: input.userId },
        //@ts-ignore

        data: { isAdmin: false },
      });

      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(deleteUserInput)
    .mutation(async ({ ctx, input }) => {
      const user = await db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      // Delete all related records
      await db.session.deleteMany({ where: { userId: input.userId } });
      await db.adminAction.deleteMany({ where: { userId: input.userId } });
      await db.gateTransaction.deleteMany({
        where: { userId: input.userId },
      });
      await db.p2PTransaction.deleteMany({
        where: { userId: input.userId },
      });
      await db.transactionMatch.deleteMany({
        where: { userId: input.userId },
      });
      await db.screenshot.deleteMany({ where: { userId: input.userId } });
      await db.userActivityLog.deleteMany({
        where: { userId: input.userId },
      });
      await db.userSession.deleteMany({ where: { userId: input.userId } });
      await db.deviceToken.deleteMany({ where: { userId: input.userId } });
      await db.tronWallet.deleteMany({ where: { userId: input.userId } });
      await db.telegramTransaction.deleteMany({
        where: { userId: input.userId },
      });

      // Finally, delete the user
      await db.user.delete({ where: { id: input.userId } });

      return { success: true };
    }),

  getGateTransactionCount: adminProcedure
    .input(transactionCountInput)
    .query(async ({ ctx, input }) => {
      const { userId, startDate, endDate } = input;

      const where: any = { userId };

      if (startDate) {
        where.createdAt = { gte: startDate };
      }

      if (endDate) {
        if (where.createdAt) {
          where.createdAt.lte = endDate;
        } else {
          where.createdAt = { lte: endDate };
        }
      }

      const count = await db.gateTransaction.count({ where });

      return { count };
    }),

  getP2PTransactionCount: adminProcedure
    .input(transactionCountInput)
    .query(async ({ ctx, input }) => {
      const { userId, startDate, endDate } = input;

      const where: any = { userId };

      if (startDate) {
        where.createdAt = { gte: startDate };
      }

      if (endDate) {
        if (where.createdAt) {
          where.createdAt.lte = endDate;
        } else {
          where.createdAt = { lte: endDate };
        }
      }

      const count = await db.p2PTransaction.count({ where });

      return { count };
    }),

  getMatchTransactionCount: adminProcedure
    .input(transactionCountInput)
    .query(async ({ ctx, input }) => {
      const { userId, startDate, endDate } = input;

      const where: any = { userId };

      if (startDate) {
        where.createdAt = { gte: startDate };
      }

      if (endDate) {
        if (where.createdAt) {
          where.createdAt.lte = endDate;
        } else {
          where.createdAt = { lte: endDate };
        }
      }

      const count = await db.transactionMatch.count({ where });

      return { count };
    }),

  searchUsers: adminProcedure
    .input(userSearchInput)
    .query(async ({ ctx, input }) => {
      const {
        startDate,
        endDate,
        isAdmin,
        search,
        limit,
        page,
        sortBy,
        sortDirection,
      } = input;

      const where: any = {};

      if (startDate) {
        where.createdAt = { gte: startDate };
      }

      if (endDate) {
        where.createdAt = { ...where.createdAt, lte: endDate };
      }

      if (isAdmin !== undefined) {
        where.isAdmin = isAdmin;
      }

      if (search) {
        where.OR = [
          { username: { contains: search } },
          { firstName: { contains: search } },
          { lastName: { contains: search } },
          { telegramId: { contains: search } },
        ];
      }

      const orderBy: any = {};
      if (sortBy && sortDirection) {
        orderBy[sortBy] = sortDirection;
      }

      const users = await db.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await db.user.count({ where });

      return { users, total };
    }),

  getDetailedEmployeeMetrics: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const { employeeId, startDate, endDate } = input;

      const employee = await db.user.findUnique({
        where: { id: employeeId },
        include: {
          gateTransactions: {
            where: {
              createdAt: { gte: startDate, lte: endDate },
              status: 1, // Assuming 1 means completed
            },
          },
          P2PTransaction: {
            where: {
              completedAt: { gte: startDate, lte: endDate },
              status: "completed",
            },
          },
          UserSession: {
            where: {
              startTime: { gte: startDate, lte: endDate },
            },
          },
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Сотрудник не найден",
        });
      }

      const workTime = await calculateWorkTime(db, employeeId, startDate, endDate);
      const gateRevenue = calculateGateRevenue(employee.gateTransactions);
      const p2pRevenue = calculateP2PRevenue(employee.P2PTransaction);
      const totalRevenue = gateRevenue + p2pRevenue;
      const weightedSpread = calculateWeightedSpread(
        employee.gateTransactions,
        employee.P2PTransaction,
      );
      const spreadInUsdt = calculateSpreadInUsdt(
        employee.gateTransactions,
        employee.P2PTransaction,
      );

      const salary = ((employee.commissionRate || 50) / 100) * totalRevenue;

      return {
        employeeId,
        name:
          //@ts-ignore

          `${employee.firstName} ${employee.lastName}`.trim() ||
          employee.username ||
          "Неизвестно",
        telegramId: employee.telegramId || "Н/Д",
        gateId: employee.telegramId, // Предполагаем, что Gate ID такой же, как Telegram ID
        workTime,
        gateTransactionsCount: employee.gateTransactions.length,
        p2pTransactionsCount: employee.P2PTransaction.length,
        totalTransactionsCount:
          employee.gateTransactions.length + employee.P2PTransaction.length,
        gateRevenue,
        p2pRevenue,
        totalRevenue,
        weightedSpread,
        spreadInUsdt,
        salary,
        initialBalance: employee.initialBalance || 0,
        finalBalance: (employee.initialBalance || 0) + totalRevenue,
      };
    }),

  getEmployeeMetrics: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        dateRange: z.object({
          from: z.string(),
          to: z.string(),
        }),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      const employee = await ctx.db.user.findUnique({
        where: { id: input.employeeId },
        include: {
          gateTransactions: {
            where: {
              createdAt: { gte: from, lte: to },
              status: 1,
            },
          },
          P2PTransaction: {
            where: {
              completedAt: { gte: from, lte: to },
              status: "completed",
            },
          },
          WorkTime: {
            where: {
              startTime: { gte: from, lte: to },
            },
          },
          UserSession: {
            where: {
              startTime: { gte: from, lte: to },
            },
          },
          employeeExpenses: {
            where: {
              createdAt: { gte: from, lte: to },
            },
          },
          comments: {
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      const workTime = await calculateWorkTime(ctx.db, input.employeeId, from, to);
      const ordersCount = employee.gateTransactions.length + employee.P2PTransaction.length;
      const revenue = calculateEmployeeRevenue(employee.gateTransactions, employee.P2PTransaction);
      const expenses = employee.employeeExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const netRevenue = revenue - expenses;
      const scamExpenses = employee.employeeExpenses
        .filter(e => e.type === 'SCAM')
        .reduce((sum, e) => sum + e.amount, 0);
      const errorExpenses = employee.employeeExpenses
        .filter(e => e.type === 'ERROR')
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        employee: {
          ...employee,
          salaryPercentage: await getEmployeeSalaryPercentage(input.employeeId),
          initialBalance: await getEmployeeInitialBalance(input.employeeId),
        },
        workTime,
        ordersCount,
        revenue,
        expenses,
        netRevenue,
        scamExpenses,
        errorExpenses,
        averageOrderAmount: ordersCount > 0 ? revenue / ordersCount : 0,
        grossProfit: revenue - expenses,
        grossProfitPercentage: revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0,
      };
    }),

  updateCustomMetric: adminProcedure
    .input(
      z.object({
        metricName: z.string(),
        formula: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { metricName, formula, description } = input;

      await db.customMetric.upsert({
        where: { name: metricName },
        //@ts-ignore

        update: { formula, description },
        //@ts-ignore

        create: { name: metricName, formula, description },
      });

      return { success: true };
    }),

  getCustomMetrics: adminProcedure.query(async () => {
    if (!db.customMetric) {
      console.warn("CustomMetric model is not defined in the database schema");
      return [];
    }
    return await db.customMetric.findMany();
  }),

  calculateCustomMetric: adminProcedure
    .input(
      z.object({
        metricId: z.number(),
        employeeId: z.number().optional(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ input }) => {
      const { metricId, employeeId, startDate, endDate } = input;

      const metric = await db.customMetric.findUnique({
        where: { id: metricId },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Метрика не найдена",
        });
      }

      const variables = await getMetricVariables(
        employeeId,
        startDate,
        endDate,
      );

      try {
        const result = evaluate(metric.formula, variables);
        return {
          name: metric.name,
          value: result,
          formula: metric.formula,
          description: metric.description,
        };
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          //@ts-ignore

          message: "Ошибка при вычислении метрики: " + (error as Error).message,
        });
      }
    }),

  createCustomMetric: adminProcedure
    .input(
      z.object({
        name: z.string(),
        formula: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { name, formula, description } = input;

      await db.customMetric.create({
        //@ts-ignore

        data: {
          name,
          formula,
          description,
        },
      });

      return { success: true };
    }),

  getTransactions: adminProcedure
    .input(
      z.object({
        startDate: z.date().nullable(),
        endDate: z.date().nullable(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ input }) => {
      const { startDate, endDate, search } = input;

      const where: any = {};

      if (startDate && endDate) {
        where.createdAt = {
          gte: startDate,
          lte: endDate,
        };
      }

      if (search) {
        where.OR = [
          { transactionId: { contains: search, mode: "insensitive" } },
          { wallet: { contains: search, mode: "insensitive" } },
        ];
      }

      const transactions = await db.gateTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return transactions;
    }),

  getTransactionCounts: adminProcedure
    .input(
      z.object({
        userIds: z.array(z.number()),
      }),
    )
    .query(async ({ input }) => {
      const { userIds } = input;

      const gateCounts = await db.gateTransaction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _count: true,
      });

      const p2pCounts = await db.p2PTransaction.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _count: true,
      });

      const matchCounts = await db.transactionMatch.groupBy({
        by: ["userId"],
        where: { userId: { in: userIds } },
        _count: true,
      });
      //@ts-ignore

      const result = userIds.map((userId) => ({
        userId,
        gateTxCount:
          //@ts-ignore

          gateCounts.find((count) => count.userId === userId)?._count ?? 0,
        p2pTxCount:
          //@ts-ignore

          p2pCounts.find((count) => count.userId === userId)?._count ?? 0,
        matchCount:
          //@ts-ignore

          matchCounts.find((count) => count.userId === userId)?._count ?? 0,
      }));

      return result;
    }),

  getEmployees: protectedProcedure
    .input(
      z.object({
        search: z.string(),
        limit: z.number(),
        dateRange: dateRangeInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const employees = await ctx.db.user.findMany({
        where: {
          OR: [
            { firstName: { contains: input.search, mode: "insensitive" } },
            { lastName: { contains: input.search, mode: "insensitive" } },
            { telegramId: { contains: input.search, mode: "insensitive" } },
          ],
        },
        take: input.limit,
      });

      const employeesWithStats = await Promise.all(
        employees.map(async (employee) => {
          const { from, to } = {
            from: new Date(input.dateRange.from),
            to: new Date(input.dateRange.to),
          };

          const [p2pCount, gateCount, matchCount, scamExpenses, errorExpenses, workTime] = await Promise.all([
            ctx.db.p2PTransaction.count({
              where: {
                userId: employee.id,
                createdAt: {
                  gte: from,
                  lte: to,
                },
              },
            }),
            ctx.db.gateTransaction.count({
              where: {
                userId: employee.id,
                createdAt: {
                  gte: from,
                  lte: to,
                },
              },
            }),
            ctx.db.transactionMatch.count({
              where: {
                userId: employee.id,
                createdAt: {
                  gte: from,
                  lte: to,
                },
              },
            }),
            ctx.db.employeeExpense.aggregate({
              where: {
                userId: employee.id,
                type: 'SCAM',
                createdAt: {
                  gte: from,
                  lte: to,
                },
              },
              _sum: { amount: true },
            }),
            ctx.db.employeeExpense.aggregate({
              where: {
                userId: employee.id,
                type: 'ERROR',
                createdAt: {
                  gte: from,
                  lte: to,
                },
              },
              _sum: { amount: true },
            }),
            calculateWorkTime(ctx.db, employee.id, from, to),
          ]);

          return {
            ...employee,
            p2pCount,
            gateCount,
            matchCount,
            scamExpenses: scamExpenses._sum.amount ?? 0,
            errorExpenses: errorExpenses._sum.amount ?? 0,
            workTime,
          };
        }),
      );

      return employeesWithStats;
    }),

  updateEmployee: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string(),
        middleName: z.string().optional(),
        lastName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.id },
        data: {
          firstName: input.firstName,
          middleName: input.middleName,
          lastName: input.lastName,
        },
      });
    }),

  updateDeposit: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        deposit: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.id },
        data: {
          deposit: input.deposit,
        },
      });
    }),

  addEmployeeExpense: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        amount: z.number(),
        currency: z.string(),
        type: z.enum(["SCAM", "ERROR"]),
        date: z.date(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employeeExpense.create({
        data: input,
      });
    }),

  getEmployeeExpenses: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        dateRange: dateRangeInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      return ctx.db.employeeExpense.findMany({
        where: {
          userId: input.userId,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  createAppeal: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        gateId: z.string(),
        employeeComment: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.appeal.create({
        data: {
          ...input,
          status: "PENDING",
        },
      });
    }),

  updateAppeal: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED"]),
        adminComment: z.string().optional(),
        isFinalized: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.appeal.update({
        where: { id: input.id },
        data: input,
      });
    }),

  getEmployeeAppeals: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        dateRange: dateRangeInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = {
        from: new Date(input.dateRange.from),
        to: new Date(input.dateRange.to),
      };

      return ctx.db.appeal.findMany({
        where: {
          userId: input.userId,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    }),

  getEmployee: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const employee = await ctx.db.user.findUnique({
        where: { id: input.id },
      });

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Employee not found",
        });
      }

      return employee;
    }),

  getUserWorkTimes: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.workTime.findMany({
        where: { userId: input.userId },
        include: {
          report: {
            include: {
              files: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
      });
    }),

  addEmployeeComment: adminProcedure
    .input(
      z.object({
        employeeId: z.number(),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.employeeComment.create({
        data: {
          userId: input.employeeId,
          content: input.content,
        },
      });
    }),

  updateEmployee: adminProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        commissionRate: z.number().optional(),
        initialBalance: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.user.update({
        where: { id },
        data,
      });
    }),

  updateEmployeePhoto: adminProcedure
    .input(
      z.object({
        id: z.number(),
        photoUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: input.id },
        data: { passportPhoto: input.photoUrl },
      });
    }),

  updateEmployeeDeposit: adminProcedure
    .input(
      z.object({
        id: z.number(),
        deposit: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: input.id },
        data: { deposit: input.deposit },
      });
    }),

  updateEmployeeSalary: adminProcedure
    .input(
      z.object({
        id: z.number(),
        salaryPercentage: z.number().min(0).max(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.user.update({
        where: { id: input.id },
        data: { salaryPercentage: input.salaryPercentage },
      });
    }),

  addEmployeeComment: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.employeeComment.create({
        data: {
          userId: input.userId,
          content: input.content,
        },
      });
    }),

  addEmployeeExpense: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        amount: z.number(),
        type: z.enum(["SCAM", "ERROR"]),
        description: z.string(),
        currency: z.enum(["RUB", "USDT"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.employeeExpense.create({
        data: {
          userId: input.userId,
          amount: input.amount,
          type: input.type,
          description: input.description,
          date: new Date(),
          currency: input.currency,
        },
      });
    }),

  getEmployeeComments: adminProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.db.employeeComment.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
      });
    }),

  getEmployeeExpenses: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        dateRange: dateRangeInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = dateRangeSchema.parse(input.dateRange);
      return await ctx.db.employeeExpense.findMany({
        where: {
          userId: input.userId,
          createdAt: {
            gte: from,
            lte: to,
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getEmployees: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
        dateRange: z.object({
          from: z.string(),
          to: z.string(),
        }).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { from, to } = input.dateRange
        ? dateRangeSchema.parse(input.dateRange)
        : { from: new Date(0), to: new Date() };

      const where = {
        ...(input.search
          ? {
              OR: [
                { firstName: { contains: input.search, mode: "insensitive" } },
                { lastName: { contains: input.search, mode: "insensitive" } },
                { telegramId: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      };

      const users = await ctx.db.user.findMany({
        where,
        take: input.limit,
        skip: input.offset,
        orderBy: { id: "asc" },
      });

      const employeeData = await Promise.all(
        users.map(async (user) => {
          const [
            workTime,
            gateTransactions,
            p2pTransactions,
            expenses,
            comments,
            matches,
          ] = await Promise.all([
            calculateWorkTime(ctx.db, user.id, from, to),
            ctx.db.gateTransaction.findMany({
              where: {
                userId: user.id,
                createdAt: { gte: from, lte: to },
              },
            }),
            ctx.db.p2PTransaction.findMany({
              where: {
                userId: user.id,
                createdAt: { gte: from, lte: to },
              },
            }),
            ctx.db.employeeExpense.findMany({
              where: {
                userId: user.id,
                createdAt: { gte: from, lte: to },
              },
            }),
            ctx.db.employeeComment.count({
              where: { userId: user.id },
            }),
            ctx.db.transactionMatch.count({
              where: {
                userId: user.id,
                createdAt: { gte: from, lte: to },
              },
            }),
          ]);

          return {
            ...user,
            workTime,
            p2pTransactions: p2pTransactions.length,
            gateTransactions: gateTransactions.length,
            matchTransactions: matches,
            scamExpenses: expenses
              .filter((e) => e.type === "SCAM")
              .reduce((sum, e) => sum + e.amount, 0),
            errorExpenses: expenses
              .filter((e) => e.type === "ERROR")
              .reduce((sum, e) => sum + e.amount, 0),
            commentsCount: comments,
          };
        }),
      );

      return employeeData;
    }),

  getEmployeeWorkTime: adminProcedure
    .input(z.object({
      userId: z.number(),
    }))
    .query(async ({ ctx, input }) => {
      const workTimes = await ctx.db.workTime.findMany({
        where: { userId: input.userId },
        orderBy: { startTime: 'desc' },
        include: {
          report: true
        }
      });
      return workTimes;
    }),
});

// Helper functions

async function getMetricVariables(
  employeeId: number | undefined,
  startDate: Date,
  endDate: Date,
) {
  const gateTransactions = await db.gateTransaction.findMany({
    where: {
      userId: employeeId,
      createdAt: { gte: startDate, lte: endDate },
      status: 1, // Assuming 1 means completed
    },
  });

  const p2pTransactions = await db.p2PTransaction.findMany({
    where: {
      userId: employeeId,
      completedAt: { gte: startDate, lte: endDate },
      status: "completed",
    },
  });

  const workSessions = await db.userSession.findMany({
    where: {
      userId: employeeId,
      startTime: { gte: startDate, lte: endDate },
    },
  });

  return {
    //@ts-ignore

    gateTransactionCount: gateTransactions.length,
    //@ts-ignore

    p2pTransactionCount: p2pTransactions.length,
    //@ts-ignore

    totalTransactionCount: gateTransactions.length + p2pTransactions.length,
    gateRevenue: calculateGateRevenue(gateTransactions),
    p2pRevenue: calculateP2PRevenue(p2pTransactions),
    totalRevenue:
      calculateGateRevenue(gateTransactions) +
      calculateP2PRevenue(p2pTransactions),
    workTime: await calculateWorkTime(db, employeeId, startDate, endDate),
    weightedSpread: calculateWeightedSpread(gateTransactions, p2pTransactions),
    spreadInUsdt: calculateSpreadInUsdt(gateTransactions, p2pTransactions),
  };
}

function calculateWeightedSpread(gateTransactions, p2pTransactions) {
  let totalUsdtVolume = 0;
  let weightedSpreadSum = 0;

  for (const gateTx of gateTransactions) {
    const matchingP2PTx = p2pTransactions.find(
      (p2pTx) =>
        //@ts-ignore

        Math.abs(
          //@ts-ignore

          new Date(p2pTx.completedAt).getTime() -
            //@ts-ignore

            new Date(gateTx.createdAt).getTime(),
        ) < 60000, // within 1 minute
    );

    if (matchingP2PTx) {
      const spread = matchingP2PTx.price - gateTx.course;
      weightedSpreadSum += spread * gateTx.amountUsdt;
      totalUsdtVolume += gateTx.amountUsdt;
    }
  }

  return totalUsdtVolume > 0 ? weightedSpreadSum / totalUsdtVolume : 0;
}

async function calculateTotalRevenue(from: Date, to: Date) {
  try {
    const gateTransactions = await db.gateTransaction.findMany({
      where: {
        createdAt: { gte: from, lte: to },
        status: 1, // Assuming 1 means completed
      },
    });
    const p2pTransactions = await db.p2PTransaction.findMany({
      where: {
        completedAt: { gte: from, lte: to },
        status: "completed",
      },
    });
    return (
      calculateGateRevenue(gateTransactions) +
      calculateP2PRevenue(p2pTransactions)
    );
  } catch (error) {
    console.error("Error calculating total revenue:", error);
    return 0;
  }
}

async function calculateNetRevenue(totalRevenue: number, from: Date, to: Date) {
  if (!db.expense) {
    console.warn("Expense model is not defined in the database schema");
    return totalRevenue; // Return total revenue if expenses can't be calculated
  }

  const expenses = await db.expense.findMany({
    where: {
      date: { gte: from, lte: to },
    },
  });
  //@ts-ignore

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  return totalRevenue - totalExpenses;
}

function calculateTotalWorkTime(sessions) {
  return sessions.reduce(
    (total, session) => total + (session.duration || 0),
    0,
  );
}

function calculateEmployeeRevenue(gateTransactions, p2pTransactions) {
  const gateFee = 0.009; // 0.9%
  const gateRevenue = gateTransactions.reduce(
    (sum, tx) => sum + tx.amountUsdt * gateFee,
    0,
  );
  const p2pRevenue = p2pTransactions.reduce(
    (sum, tx) => sum + (tx.amount * tx.price - tx.totalRub) / tx.price,
    0,
  );
  return gateRevenue + p2pRevenue;
}

async function getEmployeeSalaryPercentage(employeeId: number) {
  const employee = await db.user.findUnique({
    where: { id: employeeId },
    //@ts-ignore

    select: { salaryPercentage: true },
  });
  return employee?.salaryPercentage || 50; // Default to 50% if not set
}

async function getEmployeeInitialBalance(employeeId: number) {
  const employee = await db.user.findUnique({
    where: { id: employeeId },
    //@ts-ignore

    select: { initialBalance: true },
  });
  return employee?.initialBalance || 0;
}

function calculateTotalExpenses(expenses, dateRange) {
  return expenses.reduce((total, expense) => {
    if (expense.isRecurring && expense.period) {
      const daysInRange =
        (dateRange.to.getTime() - dateRange.from.getTime()) /
        (1000 * 60 * 60 * 24);
      //@ts-ignore

      const occurrences = Math.floor(daysInRange / parseInt(expense.period));
      return total + expense.amount * occurrences;
    } else {
      return total + expense.amount;
    }
  }, 0);
}

function calculateGateRevenue(transactions) {
  const gateFee = 0.009; // 0.9%
  if (Array.isArray(transactions)) {
    return transactions.reduce((sum, tx) => sum + tx.amountUsdt * gateFee, 0);
  } else if (transactions && typeof transactions === "object") {
    return transactions.amountUsdt * gateFee;
  }
  return 0;
}

function calculateP2PRevenue(transactions) {
  return transactions.reduce(
    (sum, tx) => sum + (tx.amount * tx.price - tx.totalRub) / tx.price,
    0,
  );
}

function calculateSpreadInUsdt(gateTransactions, p2pTransactions) {
  let totalSpreadUsdt = 0;

  for (const gateTx of gateTransactions) {
    const matchingP2PTx = p2pTransactions.find(
      (p2pTx) =>
        //@ts-ignore

        Math.abs(
          //@ts-ignore

          new Date(p2pTx.completedAt).getTime() -
            //@ts-ignore

            new Date(gateTx.createdAt).getTime(),
        ) < 60000, // within 1 minute
    );

    if (matchingP2PTx) {
      const spreadRub =
        (matchingP2PTx.price - gateTx.course) * gateTx.amountUsdt;
      totalSpreadUsdt += spreadRub / matchingP2PTx.price;
    }
  }

  return totalSpreadUsdt;
}
