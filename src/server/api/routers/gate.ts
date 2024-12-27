import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

const inputSchema = z.object({
  search: z.string().optional().default(""),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const gateRouter = createTRPCRouter({
  getAllTransactions: adminProcedure
    .input(
      z.object({
        user_ids: z.array(z.number()).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const where: Prisma.GateTransactionWhereInput = {};

        if (input.user_ids && input.user_ids.length > 0) {
          where.userId = { in: input.user_ids };
        }

        if (input.startDate && input.endDate) {
          where.createdAt = {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          };
        }

        console.log("Executing query with where:", where);

        const transactions = await ctx.db.gateTransaction.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                telegramId: true,
              },
            },
          },
        });

        console.log(`Found ${transactions.length} transactions`);

        return transactions;
      } catch (error) {
        console.error("Error in getAllTransactions:", error);
        throw error;
      }
    }),

  getTransactions: protectedProcedure
    .input(inputSchema)
    .query(async ({ ctx, input }) => {
      try {
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "User not authenticated",
          });
        }

        const where: Prisma.GateTransactionWhereInput = {
          userId: ctx.user.id,
        };

        if (input.search) {
          where.OR = [
            { transactionId: { contains: input.search } },
            { wallet: { contains: input.search } },
          ];
        }

        if (input.startDate && input.endDate) {
          where.createdAt = {
            gte: new Date(input.startDate),
            lte: new Date(input.endDate),
          };
        }

        const transactions = await ctx.db.gateTransaction.findMany({
          where,
          select: {
            id: true,
            transactionId: true,
            wallet: true,
            amountRub: true,
            amountUsdt: true,
            totalRub: true,
            totalUsdt: true,
            status: true,
            bankName: true,
            bankLabel: true,
            paymentMethod: true,
            course: true,
            successCount: true,
            successRate: true,
            approvedAt: true,
            createdAt: true,
            //@ts-ignore

            traderId: true,
            traderName: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

        // Сериализуем данные
        const serializedTransactions = transactions.map((tx) => ({
          ...tx,
          approvedAt: tx.approvedAt?.toISOString() || null,
          createdAt: tx.createdAt.toISOString(),
          amountRub: Number(tx.amountRub),
          amountUsdt: Number(tx.amountUsdt),
          totalRub: Number(tx.totalRub),
          totalUsdt: Number(tx.totalUsdt),
          course: tx.course ? Number(tx.course) : null,
          successCount: tx.successCount ? Number(tx.successCount) : null,
          successRate: tx.successRate ? Number(tx.successRate) : null,
          bankName: tx.bankName || null,
          bankLabel: tx.bankLabel || null,
          paymentMethod: tx.paymentMethod || null,
          //@ts-ignore

          traderName: tx.traderName || null,
          id: Number(tx.id),
          //@ts-ignore

          traderId: tx.traderId ? Number(tx.traderId) : null,
          // Добавляем пустой массив attachments для совместимости с фронтендом
          attachments: [],
        }));

        return serializedTransactions;
      } catch (error) {
        console.error("Error in getTransactions:", error);

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Database error: ${error.message}`,
            cause: error,
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred",
          cause: error,
        });
      }
    }),

  saveCookies: protectedProcedure
    .input(z.object({ cookies: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      try {
        // Validate that the input is actually a JSON string
        let parsedCookies: unknown;
        try {
          parsedCookies = JSON.parse(input.cookies);
          if (!Array.isArray(parsedCookies)) {
            throw new Error("Invalid cookie format");
          }
        } catch (e) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid cookie format. Expected JSON array.",
          });
        }

        // First try to find existing cookie for this user
        const existingCookie = await ctx.db.gateCookie.findFirst({
          where: {
            userId: ctx.user.id,
          },
        });

        let result;

        if (existingCookie) {
          // Update existing cookie
          result = await ctx.db.gateCookie.update({
            where: {
              id: existingCookie.id, // Use the id for update
            },
            data: {
              cookie: input.cookies,
              isActive: true,
              lastChecked: new Date(),
            },
          });
        } else {
          // Create new cookie
          result = await ctx.db.gateCookie.create({
            data: {
              userId: ctx.user.id,
              cookie: input.cookies,
              isActive: true,
              lastChecked: new Date(),
            },
          });
        }

        return {
          success: true,
          data: {
            id: result.id,
            userId: result.userId,
            cookie: result.cookie,
            isActive: result.isActive,
            createdAt: result.createdAt.toISOString(),
            updatedAt: result.updatedAt.toISOString(),
            lastChecked: result.lastChecked?.toISOString() || null,
          },
        };
      } catch (error) {
        console.error("Error in saveCookies:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Database error: ${error.message}`,
            cause: error,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save cookies",
          cause: error,
        });
      }
    }),
});
