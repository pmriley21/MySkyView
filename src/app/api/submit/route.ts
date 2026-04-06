import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import * as exifr from "exifr";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureSchema, getSql } from "@/lib/db";

export const runtime = "nodejs";

const maxUploadBytes = 25 * 1024 * 1024;
const titleSchema = z.string().trim().min(2).max(120);

const supportedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
  "image/avif",
]);

function isFiniteCoordinate(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function toValidDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

async function safeUnlink(filePath: string | null) {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch {
    // Best effort cleanup.
  }
}

export async function POST(request: Request) {
  let tempOriginalPath: string | null = null;
  let processedImagePath: string | null = null;

  try {
    const formData = await request.formData();

    const parsedTitle = titleSchema.safeParse(formData.get("title"));
    if (!parsedTitle.success) {
      return NextResponse.json({ error: "Title is required." }, { status: 400 });
    }

    const image = formData.get("image");
    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json({ error: "Uploaded file is not an image." }, { status: 400 });
    }

    if (image.size > maxUploadBytes) {
      return NextResponse.json(
        { error: "Image is too large. Max size is 25 MB." },
        { status: 400 }
      );
    }

    if (image.type && !supportedMimeTypes.has(image.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Unsupported image format. Use JPEG, PNG, WEBP, HEIC, TIFF, or AVIF." },
        { status: 400 }
      );
    }

    await ensureSchema();

    const submissionId = crypto.randomUUID();
    const originalBuffer = Buffer.from(await image.arrayBuffer());

    const rootPath = process.cwd();
    const originalsDir = path.join(rootPath, "storage", "originals");
    const webDir = path.join(rootPath, "public", "uploads", "sky");
    await mkdir(originalsDir, { recursive: true });
    await mkdir(webDir, { recursive: true });

    const originalExtension = path.extname(image.name || "").toLowerCase() || ".img";
    const tempOriginalName = `${submissionId}-orig${originalExtension}`;
    const processedFileName = `${submissionId}.webp`;

    tempOriginalPath = path.join(originalsDir, tempOriginalName);
    processedImagePath = path.join(webDir, processedFileName);

    await writeFile(tempOriginalPath, originalBuffer);

    const metadata = await exifr.parse(originalBuffer, {
      gps: true,
      tiff: true,
      exif: true,
    });

    const latitude = metadata?.latitude;
    const longitude = metadata?.longitude;

    if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
      return NextResponse.json(
        {
          error:
            "No GPS coordinates found in this image. Enable location metadata on your camera and try again.",
        },
        { status: 400 }
      );
    }

    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      return NextResponse.json(
        { error: "Invalid GPS coordinates found in image metadata." },
        { status: 400 }
      );
    }

    const capturedAt =
      toValidDate(metadata?.DateTimeOriginal) ??
      toValidDate(metadata?.CreateDate) ??
      toValidDate(metadata?.ModifyDate);

    await sharp(tempOriginalPath)
      .rotate()
      .resize({ width: 800, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82 })
      .toFile(processedImagePath);

    const publicImagePath = `/uploads/sky/${processedFileName}`;
    const sql = getSql();

    await sql`
      INSERT INTO sky_views (
        id,
        title,
        image_url,
        latitude,
        longitude,
        captured_at
      )
      VALUES (
        ${submissionId},
        ${parsedTitle.data},
        ${publicImagePath},
        ${latitude},
        ${longitude},
        ${capturedAt}
      );
    `;

    return NextResponse.json({ ok: true, id: submissionId, imageUrl: publicImagePath });
  } catch (error) {
    console.error("Upload failed", error);
    await safeUnlink(processedImagePath);
    return NextResponse.json(
      { error: "Unable to process this image right now." },
      { status: 500 }
    );
  } finally {
    await safeUnlink(tempOriginalPath);
  }
}