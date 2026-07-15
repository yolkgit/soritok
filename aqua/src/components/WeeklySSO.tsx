"use client";

import { useEffect } from "react";
import { useSession, signIn } from "next-auth/react";

/**
 * 소리톡 단일 오리진 SSO 브릿지.
 * - 다른 소리톡 앱(허브/게임/위클리 등)에서 이미 로그인돼 있으면
 *   localStorage 의 위클리 JWT(token)로 aqua 세션을 자동 생성한다.
 * - 반대로 aqua 에서 로그인하면 위클리 JWT 를 localStorage 에 심어
 *   다른 소리톡 앱들도 로그인 상태가 되게 한다.
 */
export default function WeeklySSO() {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "loading") return;
        const token = localStorage.getItem("token");

        // 1) 소리톡 로그인 → aqua 자동 로그인 (실패 시 재시도 루프 방지 플래그)
        if (status === "unauthenticated" && token && !sessionStorage.getItem("aqua-sso-tried")) {
            sessionStorage.setItem("aqua-sso-tried", "1");
            signIn("weekly-token", { token, redirect: false });
            return;
        }

        // 2) aqua 로그인 → 소리톡(localStorage) 동기화
        if (status === "authenticated") {
            sessionStorage.removeItem("aqua-sso-tried");
            const weeklyToken = session?.weeklyToken;
            if (weeklyToken && !token) {
                fetch("/api/user/me", { headers: { Authorization: `Bearer ${weeklyToken}` } })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((me) => {
                        if (me?.id) {
                            localStorage.setItem("token", weeklyToken);
                            localStorage.setItem("user", JSON.stringify(me));
                        }
                    })
                    .catch(() => {});
            }
        }
    }, [status, session]);

    return null;
}
