"use client";

import { SessionProvider } from "next-auth/react";
import WeeklySSO from "./WeeklySSO";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider basePath="/aqua/api/auth">
            <WeeklySSO />
            {children}
        </SessionProvider>
    );
}
