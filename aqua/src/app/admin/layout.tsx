import React from "react";
import { Search, PlusCircle, Settings, LayoutDashboard } from "lucide-react";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-[calc(100vh-4rem)] bg-slate-950 -mx-4 -my-8 sm:mx-0 sm:my-0 sm:rounded-3xl border border-white/5 overflow-hidden">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-white/5 hidden md:flex flex-col">
                <div className="p-6">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                        Admin Panel
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">Aquado Content Manager</p>
                </div>

                <nav className="flex-1 px-4 space-y-2 mt-4">
                    <a href="/admin" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium transition-colors">
                        <PlusCircle className="w-5 h-5" />
                        AI 생성기
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <LayoutDashboard className="w-5 h-5" />
                        어종 관리
                    </a>
                    <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <Search className="w-5 h-5" />
                        카테고리 관리
                    </a>
                    <a href="/admin/ads" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <Settings className="w-5 h-5" />
                        설정 및 광고
                    </a>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 sm:p-10 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
