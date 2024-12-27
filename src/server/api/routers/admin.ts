// src/server/api/routers/admin.ts
import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { env } from "@/env";

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
});

export const adminRouter = createTRPCRouter({
  getAllUsers: adminProcedure.query(async ({ ctx }) => {
    return await ctx.db.user.findMany({
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

      const user = await ctx.db.user.findUnique({
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

      const updatedUser = await ctx.db.user.update({
        where: { id: user.id },
        data: { isAdmin: true },
      });

      await ctx.db.adminAction.create({
        data: {
          userId: user.id,
          action: "ADMIN_ACTIVATION",
          //@ts-ignore
          details: "User activated admin privileges",
        },
      });

      return { success: true };
    }),

  generateInviteCode: adminProcedure.mutation(async ({ ctx }) => {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    await ctx.db.adminInviteCode.create({
      data: {
        code,
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
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.adminAction.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
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
      if (items.length > input.limit) {
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
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      await ctx.db.user.update({
        where: { id: input.userId },
        data: { isAdmin: true },
      });

      return { success: true };
    }),

  removeAdmin: adminProcedure
    .input(removeAdminInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
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

      await ctx.db.user.update({
        where: { id: input.userId },
        data: { isAdmin: false },
      });

      return { success: true };
    }),

  deleteUser: adminProcedure
    .input(deleteUserInput)
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      }

      // Delete all related records
      await ctx.db.session.deleteMany({ where: { userId: input.userId } });
      await ctx.db.adminAction.deleteMany({ where: { userId: input.userId } });
      await ctx.db.gateTransaction.deleteMany({
        where: { userId: input.userId },
      });
      await ctx.db.p2PTransaction.deleteMany({
        where: { userId: input.userId },
      });
      //@ts-ignore

      await ctx.db.transactionMatch.deleteMany({
        where: { userId: input.userId },
      });
      await ctx.db.screenshot.deleteMany({ where: { userId: input.userId } });
      await ctx.db.userActivityLog.deleteMany({
        where: { userId: input.userId },
      });
      await ctx.db.userSession.deleteMany({ where: { userId: input.userId } });
      await ctx.db.deviceToken.deleteMany({ where: { userId: input.userId } });
      await ctx.db.tronWallet.deleteMany({ where: { userId: input.userId } });
      await ctx.db.telegramTransaction.deleteMany({
        where: { userId: input.userId },
      });

      // Finally, delete the user
      await ctx.db.user.delete({ where: { id: input.userId } });

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

      const count = await ctx.db.gateTransaction.count({ where });

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

      const count = await ctx.db.p2PTransaction.count({ where });

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
      //@ts-ignore

      const count = await ctx.db.transactionMatch.count({ where });

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
          // Add more fields as needed
        ];
      }

      const orderBy: any = {};
      if (sortBy && sortDirection) {
        orderBy[sortBy] = sortDirection;
      }

      const users = await ctx.db.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      });

      const total = await ctx.db.user.count({ where });

      return { users, total };
    }),
});
