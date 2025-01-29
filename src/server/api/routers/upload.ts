import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export const uploadRouter = createTRPCRouter({
  uploadPassportPhoto: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        file: z.object({
          name: z.string(),
          type: z.string(),
          base64: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.file.type.startsWith("image/")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uploaded file must be an image",
        });
      }

      const buffer = Buffer.from(input.file.base64.split(",")[1], "base64");
      const fileName = `passport_${input.userId}_${Date.now()}.${
        input.file.type.split("/")[1]
      }`;
      const uploadDir = join(process.cwd(), "public", "uploads");
      const filePath = join(uploadDir, fileName);

      try {
        await writeFile(filePath, buffer);
        await ctx.db.user.update({
          where: { id: input.userId },
          data: {
            passportPhoto: `/uploads/${fileName}`,
          },
        });

        return { success: true, path: `/uploads/${fileName}` };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file",
        });
      }
    }),
});
