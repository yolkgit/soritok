import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { mkdirSync, existsSync } from "fs";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "파일이 첨부되지 않았습니다." }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        // Ensure standard clean filename
        const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const filename = `${Date.now()}_${cleanName}`;
        const uploadDir = path.join(process.cwd(), "public/uploads");

        // Create directory if it doesn't exist
        if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // This URL path maps to /public/uploads/
        const fileUrl = `/aqua/uploads/${filename}`;

        return NextResponse.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "파일 업로드 중 오류가 발생했습니다." }, { status: 500 });
    }
}
