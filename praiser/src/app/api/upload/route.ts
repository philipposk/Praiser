import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const type = formData.get("type");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (type !== "image" && type !== "video") {
      return NextResponse.json(
        { error: "type must be 'image' or 'video'" },
        { status: 400 },
      );
    }

    if (type === "image" && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid image file" }, { status: 400 });
    }
    if (type === "video" && !file.type.startsWith("video/")) {
      return NextResponse.json({ error: "Invalid video file" }, { status: 400 });
    }

    const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File exceeds ${maxBytes} bytes` },
        { status: 413 },
      );
    }

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split(".").pop() || (type === "image" ? "jpg" : "mp4");
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const uploadPath = `${type}s/${filename}`;

    const blob = await put(uploadPath, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({
      url: blob.url,
      filename,
      type: file.type,
      name: file.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Upload error:", message);
    return NextResponse.json(
      { error: "Failed to upload file", details: message },
      { status: 500 },
    );
  }
}
