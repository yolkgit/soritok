import NextAuth from "next-auth";
import "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email?: string | null;
            name?: string | null;
            image?: string | null;
            role?: string;
        };
        /** 소리톡(위클리) JWT — 다른 소리톡 앱과의 SSO 연동용 */
        weeklyToken?: string;
    }
}

import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

// 소리톡 통합 인증 서버(위클리 백엔드) — 도커 내부 주소 기본값
const WEEKLY_API = process.env.WEEKLY_API_URL || "http://api:4000/api";

/**
 * 소리톡(위클리) 계정을 aqua 로컬 User 로 미러링.
 * 인증의 원본은 위클리 DB(weekly_paper.User)이고, aqua User 는
 * 게시글/댓글/도감수집 FK 를 위한 미러 행이다. (id = 위클리 uuid)
 */
async function mirrorUser(weeklyUser: { id: string; email: string }, name?: string | null) {
    const byId = await prisma.user.findUnique({ where: { id: weeklyUser.id } });
    if (byId) return byId;
    // 통합 이전에 만들어진 레거시 로컬 계정(같은 이메일)이 있으면 그 행을 그대로 사용
    const byEmail = await prisma.user.findUnique({ where: { email: weeklyUser.email } });
    if (byEmail) return byEmail;
    return prisma.user.create({
        data: {
            id: weeklyUser.id,
            email: weeklyUser.email,
            name: name || weeklyUser.email.split("@")[0],
        },
    });
}

export const authOptions = {
    providers: [
        // 이메일+비밀번호 — 검증은 위클리 백엔드(소리톡 통합 계정)로 위임
        CredentialsProvider({
            id: "credentials",
            name: "소리톡 통합 로그인",
            credentials: {
                email: { label: "이메일", type: "email", placeholder: "hello@example.com" },
                password: { label: "비밀번호", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("이메일과 비밀번호를 입력해주세요.");
                }

                const res = await fetch(`${WEEKLY_API}/auth/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: credentials.email, password: credentials.password }),
                });
                const data = await res
                    .json()
                    .catch(() => ({}) as { error?: string; token?: string; user?: { id: string; email: string } });

                if (!res.ok || !data.token || !data.user) {
                    const msg =
                        data.error === "User not found"
                            ? "가입되지 않은 이메일입니다."
                            : data.error === "Invalid password"
                              ? "비밀번호가 일치하지 않습니다."
                              : data.error || "로그인에 실패했습니다.";
                    throw new Error(msg);
                }

                const local = await mirrorUser(data.user);
                return {
                    id: local.id,
                    email: local.email,
                    name: local.name,
                    image: local.image,
                    role: local.role,
                    weeklyToken: data.token,
                } as any;
            },
        }),
        // 소리톡 다른 앱에서 이미 로그인된 경우(localStorage JWT)의 자동 SSO 로그인
        CredentialsProvider({
            id: "weekly-token",
            name: "소리톡 SSO",
            credentials: {
                token: { label: "token", type: "text" },
            },
            async authorize(credentials) {
                if (!credentials?.token) return null;
                const res = await fetch(`${WEEKLY_API}/user/me`, {
                    headers: { Authorization: `Bearer ${credentials.token}` },
                });
                if (!res.ok) return null;
                const me = await res.json().catch(() => null);
                if (!me?.id || !me?.email) return null;

                const local = await mirrorUser({ id: me.id, email: me.email });
                return {
                    id: local.id,
                    email: local.email,
                    name: local.name,
                    image: local.image,
                    role: local.role,
                    weeklyToken: credentials.token,
                } as any;
            },
        }),
    ],
    session: {
        strategy: "jwt" as const,
    },
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                token.weeklyToken = user.weeklyToken;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as string;
            }
            session.weeklyToken = token.weeklyToken as string | undefined;
            return session;
        },
    },
    pages: {
        signIn: "/login",
    },
    secret: process.env.NEXTAUTH_SECRET || "default_secret_key_for_development",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
