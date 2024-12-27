import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { Prisma } from "@prisma/client";

export const receiptRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        isVerified: z.boolean().optional(),
        dateRange: z.object({
          from: z.string(),
          to: z.string(),
        }),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).default(9),
      }),
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: Prisma.ReceiptWhereInput = {
        GateTransaction: {
          userId: ctx.user.id,
          createdAt: {
            gte: new Date(input.dateRange.from),
            lte: new Date(input.dateRange.to),
          },
        },
        ...(input.isVerified !== undefined
          ? { isVerified: input.isVerified }
          : {}),
        ...(input.search
          ? {
              OR: [
                {
                  bankLabel: {
                    contains: input.search,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
                {
                  GateTransaction: {
                    transactionId: {
                      contains: input.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                },
              ],
            }
          : {}),
      };

      const [total, items] = await Promise.all([
        ctx.db.receipt.count({ where }),
        ctx.db.receipt.findMany({
          where,
          include: {
            GateTransaction: {
              select: {
                transactionId: true,
                amountRub: true,
                amountUsdt: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: input.limit,
        }),
      ]);

      return {
        items,
        total,
        pages: Math.ceil(total / input.limit),
      };
    }),

  setVerified: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        isVerified: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.receipt.update({
        where: {
          id: input.id,
          GateTransaction: {
            userId: ctx.user.id,
          },
        },
        data: {
          isVerified: input.isVerified,
        },
      });
    }),
});
