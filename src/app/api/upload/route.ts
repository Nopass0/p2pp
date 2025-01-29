import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const uploadedFiles = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uniqueId = nanoid();
        const ext = file.name.split(".").pop();
        const filename = `${uniqueId}.${ext}`;
        const path = join("uploads", filename);
        const fullPath = join(uploadDir, filename);

        await writeFile(fullPath, buffer);

        return {
          filename: file.name,
          path: path,
        };
      })
    );

    return NextResponse.json(uploadedFiles);
  } catch (error) {
    console.error("Error handling file upload:", error);
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};
