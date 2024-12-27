import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import { db } from "@/server/db";

interface CreateContextOptions {
  headers: Headers;
}

export const createTRPCContext = async (opts: CreateContextOptions) => {
  try {
    const token = opts.headers.get("authorization")?.replace("Bearer ", "");
    let user = null;

    if (token) {
      const session = await db.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date()) {
        user = session.user;
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
  transformer: undefined,
  errorFormatter({ shape, error }) {
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

// Middleware для проверки аутентификации
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

// Middleware для проверки прав администратора
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
      message: "Not authorized. Admin access required.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = t.procedure.use(enforceUserIsAdmin);
