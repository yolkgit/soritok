
import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Lock, Mail } from 'lucide-react';
import { ScheduleGrid } from '../components/ScheduleGrid';
import { INITIAL_SCHEDULE, getTimeRange } from '../constants';

export const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const data = await api.login(email, password);
                login(data.token, data.user);
            } else {
                const data = await api.signup(email, password);
                login(data.token, data.user);
            }
        } catch (err: any) {
            setError(err.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center bg-slate-50 p-4 overflow-hidden">
            {/* Background Schedule Grid */}
            <div className="absolute inset-0 z-0 pointer-events-none select-none blur-md opacity-80 overflow-hidden">
                <div className="h-[150vh] w-full mt-[-10vh]">
                    <ScheduleGrid
                        schedule={INITIAL_SCHEDULE}
                        onSlotClick={() => { }}
                        onRangeSelect={() => { }}
                        isParentMode={false}
                        isPlanConfirmed={true}
                        fontConfig={{
                            titleFont: "font-sans",
                            bodyFont: "font-sans",
                            fontWeight: "font-normal"
                        }}
                        timeRange={getTimeRange('elementary')}
                    />
                </div>
            </div>

            <div className="relative z-10 bg-white/70 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/50">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-black text-slate-800 mb-2 drop-shadow-sm">
                        {isLogin ? '로그인' : '회원가입'}
                    </h1>
                    <p className="text-slate-600 font-medium drop-shadow-sm">Weekly Paper에 오신 것을 환영합니다!</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-bold border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 drop-shadow-sm">이메일</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white/90 shadow-inner"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1 drop-shadow-sm">비밀번호</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white/90 shadow-inner"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? '처리 중...' : (isLogin ? <><LogIn size={18} /> 로그인</> : <><UserPlus size={18} /> 가입하기</>)}
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-slate-200/50">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-indigo-700 hover:text-indigo-900 font-extrabold hover:underline transition-all drop-shadow-sm"
                    >
                        {isLogin ? '계정이 없으신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
                    </button>
                </div>
            </div>
        </div>
    );
};
