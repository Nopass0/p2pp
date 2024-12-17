// src/server/api/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { db } from "@/server/db";

interface CreateContextOptions {
  headers: Headers;
}

export const createTRPCContext = async (opts: CreateContextOptions) => {
  try {
    const token = opts.headers.get("authorization")?.replace("Bearer ", "");
    console.log("Context token:", token);
    let user = null;

    if (token) {
      const session = await db.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date()) {
        user = session.user;
        console.log("Context user:", user);
      }
    }

    return {
      db,
      user,
      headers: opts.headers,
    };
  } catch (error) {
    console.error("Error creating context:", error);
    return {
      db,
      user: null,
      headers: opts.headers,
    };
  }
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: undefined, // Отключаем трансформер для всех процедур
  errorFormatter({ shape, error }) {
    console.log("TRPC Error:", error);
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Создаем базовый роутер без трансформации
const baseRouter = t.router;
const baseProcedure = t.procedure;

// Middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

const enforceUserIsAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Not authorized",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// Export router and procedures
export const createTRPCRouter = baseRouter;
export const publicProcedure = baseProcedure;
export const protectedProcedure = baseProcedure.use(enforceUserIsAuthed);
export const adminProcedure = baseProcedure.use(enforceUserIsAdmin);
