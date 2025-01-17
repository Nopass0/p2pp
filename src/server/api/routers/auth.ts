import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";

const userSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  login: z.string(),
  password: z.string(),
});

export const authRouter = createTRPCRouter({
  register: publicProcedure
    .input(userSchema)
    .mutation(async ({ ctx, input }) => {
      //@ts-ignore

      const existingUser = await ctx.db.user.findUnique({
        where: { login: input.login },
      });

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Login already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);
      //@ts-ignore

      const user = await ctx.db.user.create({
        data: {
          login: input.login,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
        },
      });

      return { success: true, userId: user.id };
    }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    //@ts-ignore

    const user = await ctx.db.user.findUnique({
      where: { login: input.login },
    });

    if (
      !user ||
      !user.password ||
      !(await bcrypt.compare(input.password, user.password))
    ) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid login or password",
      });
    }

    const token = randomUUID();
    //@ts-ignore

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    //@ts-ignore

    await ctx.db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    return {
      token,
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }),

  getSession: publicProcedure.query(async ({ ctx }) => {
    //@ts-ignore

    const token = ctx.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return null;
    }
    //@ts-ignore

    const session = await ctx.db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    //@ts-ignore

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    return {
      user: {
        id: session.user.id,
        login: session.user.login,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        isAdmin: session.user.isAdmin,
      },
    };
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    //@ts-ignore

    const token = ctx.headers.get("authorization")?.replace("Bearer ", "");
    if (token) {
      //@ts-ignore

      await ctx.db.session.deleteMany({
        where: {
          token,
          userId: ctx.user.id,
        },
      });
    }
    return { success: true };
  }),
});
