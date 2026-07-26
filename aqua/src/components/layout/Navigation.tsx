"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

// whitespace-nowrap/shrink-0 이 없으면 좁은 화면에서 flex 가 링크를 찌그러뜨려
// "자랑하기" 같은 글자가 한 자씩 세로로 쌓인다. 넘칠 땐 가로 스크롤로 처리.
const linkBase = "transition-colors whitespace-nowrap shrink-0";

export default function Navigation() {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <nav
            className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium
                       max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            <Link
                href="/"
                className={`${linkBase} ${pathname === "/" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
            >
                홈
            </Link>
            <Link
                href="/community"
                className={`${linkBase} ${pathname === "/community" ? "text-teal-400" : "text-slate-300 hover:text-white"}`}
            >
                자랑하기
            </Link>
            <Link
                href="/qna"
                className={`${linkBase} ${pathname?.startsWith("/qna") ? "text-amber-400" : "text-slate-300 hover:text-white"}`}
            >
                Q&A
            </Link>
            <Link
                href="/collection"
                className={`${linkBase} ${pathname === "/collection" ? "text-pink-400" : "text-slate-300 hover:text-white"}`}
            >
                내 도감
            </Link>
            {session?.user?.role === "ADMIN" && (
                <Link
                    href="/admin"
                    className={`${linkBase} ${pathname === "/admin" ? "text-blue-400" : "text-slate-300 hover:text-white"}`}
                >
                    관리자
                </Link>
            )}

            <div className="flex items-center gap-2 sm:gap-3 border-l border-slate-700 pl-3 sm:pl-6 sm:ml-2 shrink-0">
                {session ? (
                    <>
                        <span className="text-slate-300 text-xs hidden sm:inline-block whitespace-nowrap">
                            {session.user?.name || "사용자"}님
                        </span>
                        <button
                            onClick={() => signOut({ callbackUrl: "/aqua/" })}
                            className="text-slate-300 hover:text-white transition-colors text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0"
                        >
                            로그아웃
                        </button>
                    </>
                ) : (
                    <Link
                        href="/login"
                        className="text-teal-400 hover:text-teal-300 transition-colors text-xs font-bold border border-teal-500/30 hover:border-teal-400 hover:bg-teal-500/10 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0"
                    >
                        로그인
                    </Link>
                )}
            </div>
        </nav>
    );
}
