import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 소리톡 통합 인증 서버(위클리 백엔드) — 가입도 위클리 User 테이블에 생성
const WEEKLY_API = process.env.WEEKLY_API_URL || "http://api:4000/api";

export async function POST(req: Request) {
    try {
        const { name, email, password } = await req.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "이름, 이메일, 비밀번호를 모두 입력해주세요." },
                { status: 400 }
            );
        }

        const res = await fetch(`${WEEKLY_API}/auth/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res
            .json()
            .catch(() => ({}) as { error?: string; token?: string; user?: { id: string; email: string } });

        if (!res.ok || !data.user) {
            const msg =
                data.error === "User already exists"
                    ? "이미 가입된 이메일입니다."
                    : data.error || "회원가입에 실패했습니다.";
            return NextResponse.json({ error: msg }, { status: res.ok ? 500 : res.status });
        }

        // aqua 미러 유저 생성 — 닉네임(name)은 aqua 쪽에 저장 (FK 용, 인증 원본은 위클리)
        await prisma.user.upsert({
            where: { id: data.user.id },
            update: { name },
            create: { id: data.user.id, email, name },
        });

        return NextResponse.json(
            { success: true, user: { id: data.user.id, email, name } },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "회원가입 처리 중 오류가 발생했습니다." },
            { status: 500 }
        );
    }
}
