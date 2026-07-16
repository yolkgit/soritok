"use client";

import { useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const TRIED_KEY = "aqua-sso-tried-token";

/**
 * 소리톡 단일 오리진 SSO 브릿지.
 * - 다른 소리톡 앱(허브/게임/위클리 등)에서 이미 로그인돼 있으면
 *   localStorage 의 위클리 JWT(token)로 aqua 세션을 자동 생성한다.
 * - 반대로 aqua 에서 로그인하면 위클리 JWT 를 localStorage 에 심어
 *   다른 소리톡 앱들도 로그인 상태가 되게 한다.
 * - 통합 이전(레거시) 세션(weeklyToken 없음)은 한 번 정리해 재로그인을 유도한다.
 */
export default function WeeklySSO() {
    const { data: session, status } = useSession();

    useEffect(() => {
        if (status === "loading") return;
        const token = localStorage.getItem("token");

        if (status === "unauthenticated") {
            // 소리톡 로그인 → aqua 자동 로그인.
            // 같은 토큰으로 이미 실패한 적이 있으면 재시도하지 않음(루프 방지).
            // 단, 토큰이 바뀌었거나 일시 오류였던 경우는 다시 시도한다.
            if (token && sessionStorage.getItem(TRIED_KEY) !== token) {
                sessionStorage.setItem(TRIED_KEY, token);
                signIn("weekly-token", { token, redirect: false }).then((res) => {
                    if (res?.error && res.error !== "CredentialsSignin") {
                        // 네트워크 등 일시 오류 → 다음 렌더에서 재시도 허용
                        sessionStorage.removeItem(TRIED_KEY);
                    }
                });
            }
            return;
        }

        // status === "authenticated"
        const weeklyToken = session?.weeklyToken;

        // 통합 이전에 만들어진 레거시 세션(위클리 토큰 없음) → 세션 정리
        if (!weeklyToken) {
            signOut({ redirect: false });
            return;
        }

        sessionStorage.removeItem(TRIED_KEY);

        // aqua 로그인 → 소리톡(localStorage) 동기화
        if (!token) {
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
    }, [status, session]);

    return null;
}
