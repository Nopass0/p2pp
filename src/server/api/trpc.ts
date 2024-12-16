import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "@/server/db";

export interface CreateContextOptions {
  headers: Headers;
}

export const createTRPCContext = async (opts: CreateContextOptions) => {
  try {
    const token = opts.headers.get("authorization")?.replace("Bearer ", "");
    console.log("Context token:", token);

    let user = null;
    if (token) {
      const session = await db.session.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: true,
        },
      });

      if (session?.user) {
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
  transformer: superjson,
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

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "Not authenticated" 
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
      message: "Not authenticated" 
    });
  }
  
  if (!ctx.user.isAdmin) {
    throw new TRPCError({ 
      code: "UNAUTHORIZED",
      message: "Not authorized" 
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
export const adminProcedure = protectedProcedure.use(enforceUserIsAdmin);
