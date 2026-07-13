"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <nav className="flex items-center gap-6 text-sm font-medium">
            <Link
                href="/"
                className={`transition-colors ${pathname === "/" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
            >
                홈
            </Link>
            <Link
                href="/community"
                className={`transition-colors ${pathname === "/community" ? "text-teal-400" : "text-slate-300 hover:text-white"}`}
            >
                자랑하기
            </Link>
            <Link
                href="/qna"
                className={`transition-colors ${pathname?.startsWith("/qna") ? "text-amber-400" : "text-slate-300 hover:text-white"}`}
            >
                Q&A
            </Link>
            <Link
                href="/collection"
                className={`transition-colors ${pathname === "/collection" ? "text-pink-400" : "text-slate-300 hover:text-white"}`}
            >
                내 도감
            </Link>
            {session?.user?.role === "ADMIN" && (
                <Link
                    href="/admin"
                    className={`transition-colors ${pathname === "/admin" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
                >
                    관리자
                </Link>
            )}

            <div className="flex items-center gap-3 border-l border-slate-700 pl-6 ml-2">
                {session ? (
                    <>
                        <span className="text-slate-300 text-xs hidden sm:inline-block">
                            {session.user?.name || "사용자"}님
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: "/aqua/" })}
                            className="text-slate-300 hover:text-white transition-colors text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg"
                        >
                            로그아웃
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="text-teal-400 hover:text-teal-300 transition-colors text-xs font-bold border border-teal-500/30 hover:border-teal-400 hover:bg-teal-500/10 px-3 py-1.5 rounded-lg"
                    >
                        로그인
                    </Link>
                )}
            </div>
        </nav>
    );
}
