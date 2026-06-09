import React, { useState, useEffect } from 'react';
import { Save, Shield, Settings, AlertTriangle, Monitor, XCircle, CheckCircle, RotateCcw, Sparkles } from 'lucide-react';
import { api } from './services/api';

export const AdminDashboard: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Config States
    const [adsEnabled, setAdsEnabled] = useState(false);
    const [adsenseId, setAdsenseId] = useState('');
    const [coupangHtml, setCoupangHtml] = useState('');
    const [adsenseInterstitialId, setAdsenseInterstitialId] = useState('');
    const [coupangInterstitialHtml, setCoupangInterstitialHtml] = useState('');
    const [adsenseMobileBottomId, setAdsenseMobileBottomId] = useState('');
    const [coupangMobileBottomHtml, setCoupangMobileBottomHtml] = useState('');
    const [interstitialTimer, setInterstitialTimer] = useState('3');
    const [interstitialWidth, setInterstitialWidth] = useState('512');
    const [interstitialHeight, setInterstitialHeight] = useState('512');
    const [kakaoQrCode, setKakaoQrCode] = useState(''); // Base64

    // Layout States
    const [adWidth, setAdWidth] = useState('160');
    const [adHeight, setAdHeight] = useState('600');
    const [adMargin, setAdMargin] = useState('16');
    const [adTop, setAdTop] = useState('50%');
    const [isLoading, setIsLoading] = useState(false);

    // Tab State
    const [activeTab, setActiveTab] = useState<'settings' | 'users'>('settings');

    // Donation Lists
    const [pendingDeposits, setPendingDeposits] = useState<any[]>([]);
    const [approvedDonations, setApprovedDonations] = useState<any[]>([]);

    // User List State
    const [users, setUsers] = useState<any[]>([]);

    const loadDonations = async () => {
        try {
            const [pendingRes, approvedRes] = await Promise.all([
                fetch('/api/admin/pending-deposits'),
                fetch('/api/admin/approved-donations')
            ]);
            const pendingData = await pendingRes.json();
            const approvedData = await approvedRes.json();

            if (Array.isArray(pendingData)) setPendingDeposits(pendingData);
            if (Array.isArray(approvedData)) setApprovedDonations(approvedData);
        } catch (e) {
            console.error(e);
        }
    };

    const loadConfig = async () => {
        try {
            const config = await api.getPublicConfig();
            setAdsEnabled(config['ADS_ENABLED'] === 'true');
            setAdsenseId(config['ADSENSE_SLOT_ID'] || '');
            setCoupangHtml(config['COUPANG_BANNER_HTML'] || '');
            setAdsenseInterstitialId(config['ADSENSE_INTERSTITIAL_ID'] || '');
            setCoupangInterstitialHtml(config['COUPANG_INTERSTITIAL_HTML'] || '');
            setAdsenseMobileBottomId(config['ADSENSE_MOBILE_ID'] || '');
            setCoupangMobileBottomHtml(config['COUPANG_MOBILE_HTML'] || '');
            setInterstitialTimer(config['AD_INTERSTITIAL_TIMER'] || '3');
            setInterstitialWidth(config['AD_INTERSTITIAL_WIDTH'] || '512');
            setInterstitialHeight(config['AD_INTERSTITIAL_HEIGHT'] || '512');
            setKakaoQrCode(config['KAKAO_PAY_QR'] || '');
            setAdWidth(config['AD_SIDEBAR_WIDTH'] || '160');
            setAdHeight(config['AD_SIDEBAR_HEIGHT'] || '600');
            setAdMargin(config['AD_SIDEBAR_MARGIN'] || '16');
            setAdTop(config['AD_SIDEBAR_TOP'] || '50%');
        } catch (e) {
            console.error("Failed to load config", e);
        }
    };

    useEffect(() => {
        // Load public config initially to see current state
        loadConfig();
        if (isAuthenticated) loadDonations();
    }, [isAuthenticated]);

    // Load users when switching to 'users' tab
    useEffect(() => {
        if (isAuthenticated && activeTab === 'users') {
            loadUsers();
        }
    }, [isAuthenticated, activeTab]);

    const loadUsers = async () => {
        try {
            const data = await api.adminGetUsers(password);
            setUsers(data);
        } catch (e) {
            console.error("Failed to load users", e);
            alert("유저 목록을 불러오는 데 실패했습니다.");
        }
    };

    const approveDeposit = async (userId: string) => {
        if (!confirm("입금을 확인하고 승인하시겠습니까?")) return;
        try {
            const res = await fetch('/api/admin/approve-deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });
            if (res.ok) {
                alert("승인되었습니다.");
                loadDonations();
            } else {
                alert("실패했습니다.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const revokeDonation = async (userId: string) => {
        if (!confirm("정말 승인을 취소하고 광고를 다시 노출하시겠습니까?")) return;
        try {
            const res = await fetch('/api/admin/revoke-donation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, password })
            });
            if (res.ok) {
                alert("취소되었습니다.");
                loadDonations();
            } else {
                alert("실패했습니다.");
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleResetPassword = async (userId: string) => {
        if (!confirm("정말 비밀번호를 초기화하시겠습니까?\n이 유저의 비밀번호는 123456(부모모드: 0000)으로 강제 변경됩니다.")) return;
        try {
            await api.adminResetUserPassword(password, userId);
            alert("비밀번호가 초기화되었습니다.\n(로그인: 123456 / 부모모드: 0000)");
        } catch (e) {
            console.error(e);
            alert("비밀번호 초기화 실패");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("이 유저의 모든 데이터(아이, 시간표 등)가 영구 삭제됩니다. 진행할까요?")) return;
        try {
            await api.adminDeleteUser(password, userId);
            alert("유저가 영구 삭제되었습니다.");
            loadUsers(); // Refresh the list
        } catch (e) {
            console.error(e);
            alert("유저 삭제 실패");
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'admin1234') {
            setIsAuthenticated(true);
        } else {
            alert("비밀번호가 틀렸습니다.");
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await api.updateAdminConfig(password, {
                ADS_ENABLED: String(adsEnabled),
                ADSENSE_SLOT_ID: adsenseId,
                COUPANG_BANNER_HTML: coupangHtml,
                KAKAO_PAY_QR: kakaoQrCode,
                AD_SIDEBAR_WIDTH: adWidth,
                AD_SIDEBAR_HEIGHT: adHeight,
                AD_SIDEBAR_MARGIN: adMargin,
                AD_SIDEBAR_TOP: adTop,
                ADSENSE_INTERSTITIAL_ID: adsenseInterstitialId,
                COUPANG_INTERSTITIAL_HTML: coupangInterstitialHtml,
                ADSENSE_MOBILE_ID: adsenseMobileBottomId,
                COUPANG_MOBILE_HTML: coupangMobileBottomHtml,
                AD_INTERSTITIAL_TIMER: interstitialTimer,
                AD_INTERSTITIAL_WIDTH: interstitialWidth,
                AD_INTERSTITIAL_HEIGHT: interstitialHeight
            });
            alert("설정이 저장되었습니다.");
        } catch (e) {
            alert("설정 저장 실패 (비밀번호 확인)");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                    <div className="flex justify-center mb-6">
                        <div className="bg-indigo-100 p-3 rounded-full">
                            <Shield size={32} className="text-indigo-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">관리자 접속</h2>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="관리자 비밀번호"
                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                            접속하기
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            {/* Header */}
            <header className="bg-indigo-900 text-white px-6 py-4 shadow-lg sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Settings size={24} className="text-indigo-300" />
                        <h1 className="text-xl font-bold">Admin Dashboard</h1>
                    </div>
                    <button onClick={() => setIsAuthenticated(false)} className="text-sm bg-indigo-800 px-3 py-1 rounded hover:bg-indigo-700">로그아웃</button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-slate-200 sticky top-[68px] z-40">
                <div className="max-w-4xl mx-auto px-6 flex items-center gap-6 text-sm font-bold text-slate-500">
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 border-b-2 transition-colors ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-900' : 'border-transparent hover:text-slate-800'}`}
                    >
                        광고 및 설정 관리
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`py-4 border-b-2 transition-colors ${activeTab === 'users' ? 'border-indigo-600 text-indigo-900' : 'border-transparent hover:text-slate-800'}`}
                    >
                        회원 관리
                    </button>
                </div>
            </div>

            <main className="max-w-4xl mx-auto p-6 space-y-6">

                {activeTab === 'users' ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="font-bold text-slate-700 flex items-center gap-2">
                                <Monitor size={20} className="text-slate-500" />
                                전체 가입 회원 목록 ({users.length}명)
                            </h2>
                            <button onClick={loadUsers} className="text-xs text-indigo-600 font-bold hover:underline">
                                새로고침
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 font-bold">회원 이메일</th>
                                        <th className="px-6 py-3 font-bold text-center">결제 상태</th>
                                        <th className="px-6 py-3 font-bold">가입 날짜</th>
                                        <th className="px-6 py-3 font-bold text-right">관리 (Action)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {users.map(u => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">{u.email}</td>
                                            <td className="px-6 py-4 text-center">
                                                {u.isPremium ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                                        <Sparkles size={12} />
                                                        프리미엄 ({u.premiumStatus})
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">무료</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(u.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleResetPassword(u.id)}
                                                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                                >
                                                    비밀번호 초기화
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(u.id)}
                                                    className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-500 px-3 py-1.5 rounded text-xs font-bold transition-colors"
                                                >
                                                    계정 삭제
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {users.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                                                등록된 가입자가 없습니다.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Deposit Requests */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                                <Monitor size={20} className="text-slate-500" />
                                <h2 className="font-bold text-indigo-900">후원 확인 요청 ({pendingDeposits.length})</h2>
                            </div>
                            <div className="p-0">
                                {pendingDeposits.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">대기 중인 후원 요청이 없습니다.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {pendingDeposits.map(user => (
                                            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <div className="font-bold text-slate-800">{user.email}</div>
                                                    <div className="text-sm text-indigo-600 font-bold mt-0.5">입금자명: {user.depositorName || '(미입력)'}</div>
                                                    <div className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()} 가입</div>
                                                </div>
                                                <button
                                                    onClick={() => approveDeposit(user.id)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
                                                >
                                                    승인하기
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Approved Donations List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
                            <div className="bg-emerald-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                                <CheckCircle size={20} className="text-emerald-600" />
                                <h2 className="font-bold text-emerald-900">승인된 후원 ({approvedDonations.length})</h2>
                            </div>
                            <div className="p-0">
                                {approvedDonations.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 text-sm">승인된 후원이 없습니다.</div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {approvedDonations.map(user => (
                                            <div key={user.id} className="p-4 flex items-center justify-between hover:bg-emerald-50/30 transition-colors">
                                                <div>
                                                    <div className="font-bold text-slate-800">{user.email}</div>
                                                    <div className="text-sm text-emerald-600 font-bold mt-0.5">입금자명: {user.depositorName || '(미입력)'}</div>
                                                    <div className="text-xs text-slate-500">{new Date(user.createdAt).toLocaleDateString()} 가입</div>
                                                </div>
                                                <button
                                                    onClick={() => revokeDonation(user.id)}
                                                    className="bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                                                >
                                                    <RotateCcw size={14} /> 승인 취소
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold mb-1">앱 광고 상태</h2>
                                <p className={`text-sm font-medium flex items-center gap-1 ${adsEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                                    {adsEnabled ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                    {adsEnabled ? "현재 광고가 노출되고 있습니다." : "현재 광고가 꺼져 있습니다."}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-600">광고 ON/OFF</span>
                                <div
                                    onClick={() => setAdsEnabled(!adsEnabled)}
                                    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${adsEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                >
                                    <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${adsEnabled ? 'translate-x-6' : ''}`} />
                                </div>
                            </div>
                        </div>

                        {/* Ad Settings */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center gap-2">
                                <Monitor size={20} className="text-slate-500" />
                                <h2 className="font-bold text-slate-700">광고 배너 설정</h2>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* AdSense */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">Google AdSense Slot ID</label>
                                    <input
                                        type="text"
                                        value={adsenseId}
                                        onChange={e => setAdsenseId(e.target.value)}
                                        placeholder="예: 1234567890"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">사이드바 및 전면 슬롯 ID (Client ID는 코드에 직접 삽입 권장)</p>
                                </div>

                                {/* Coupang */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">사이드바: Coupang Partners HTML</label>
                                    <textarea
                                        value={coupangHtml}
                                        onChange={e => setCoupangHtml(e.target.value)}
                                        placeholder="<iframe>...</iframe>"
                                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm h-32 resize-none"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">사이드바용 쿠팡 파트너스 iframe 코드를 붙여넣으세요.</p>
                                </div>

                                {/* Mobile Bottom Ad Settings */}
                                <div className="pt-6 border-t border-slate-100 space-y-6">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Monitor size={16} className="text-indigo-500" />
                                        모바일 하단 고정 배너 설정
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Google AdSense 모바일 하단 Slot ID</label>
                                        <input
                                            type="text"
                                            value={adsenseMobileBottomId}
                                            onChange={e => setAdsenseMobileBottomId(e.target.value)}
                                            placeholder="모바일 하단 슬롯 ID"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">모바일 하단: Coupang Partners HTML</label>
                                        <textarea
                                            value={coupangMobileBottomHtml}
                                            onChange={e => setCoupangMobileBottomHtml(e.target.value)}
                                            placeholder="<iframe>...</iframe>"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm h-32 resize-none"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">모바일 환경에서 화면 하단에 늘 고정되는 추천 사이즈 코드(높이 50~60px)를 삽입하세요.</p>
                                    </div>
                                </div>

                                {/* Interstitial Settings */}
                                <div className="pt-6 border-t border-slate-100 space-y-6">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <Sparkles size={16} className="text-indigo-500" />
                                        전면 광고 설정 (팝업)
                                    </h3>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">Google AdSense 전면 Slot ID</label>
                                        <input
                                            type="text"
                                            value={adsenseInterstitialId}
                                            onChange={e => setAdsenseInterstitialId(e.target.value)}
                                            placeholder="전면 광고용 슬롯 ID"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">전면 광고 노출 시간 (초)</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="0"
                                                max="60"
                                                value={interstitialTimer}
                                                onChange={e => setInterstitialTimer(e.target.value)}
                                                className="w-24 px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                            />
                                            <span className="text-sm text-slate-500 font-bold">초</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">광고 창이 열린 후 닫기 버튼이 활성화될 때까지의 시간입니다. (기본: 3초)</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">팝업 너비 (Width)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={interstitialWidth}
                                                    onChange={e => setInterstitialWidth(e.target.value)}
                                                    placeholder="512"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                                />
                                                <span className="text-xs text-slate-400">px</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">팝업 높이 (Height)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={interstitialHeight}
                                                    onChange={e => setInterstitialHeight(e.target.value)}
                                                    placeholder="512"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                                />
                                                <span className="text-xs text-slate-400">px</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">전면: Coupang Partners HTML</label>
                                        <textarea
                                            value={coupangInterstitialHtml}
                                            onChange={e => setCoupangInterstitialHtml(e.target.value)}
                                            placeholder="<iframe>...</iframe>"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm h-32 resize-none"
                                        />
                                        <p className="text-xs text-slate-400 mt-1">전면 팝업용 쿠팡 파트너스 iframe 코드를 붙여넣으세요.</p>
                                    </div>
                                </div>
                                {/* KakaoPay QR */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2">카카오페이 QR 송금 코드</label>

                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            setKakaoQrCode(reader.result as string);
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                            />
                                            <p className="text-xs text-slate-400 mt-1">카카오페이 송금 받기 QR코드 이미지를 업로드하세요. (이미지는 자동으로 변환되어 저장됩니다)</p>
                                        </div>
                                        {kakaoQrCode && (
                                            <div className="w-24 h-24 border border-slate-200 rounded-lg overflow-hidden bg-white shrink-0">
                                                <img src={kakaoQrCode} alt="Kakao QR" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Sidebar Layout Settings */}
                                <div className="pt-6 border-t border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Settings size={16} className="text-slate-400" />
                                        사이드바 레이아웃 설정
                                    </h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">너비 (Width)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={adWidth}
                                                    onChange={e => setAdWidth(e.target.value)}
                                                    placeholder="160"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <span className="text-xs text-slate-400">px</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">높이 (Height)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={adHeight}
                                                    onChange={e => setAdHeight(e.target.value)}
                                                    placeholder="600"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <span className="text-xs text-slate-400">px</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">좌우 여백 (Margin)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={adMargin}
                                                    onChange={e => setAdMargin(e.target.value)}
                                                    placeholder="16"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <span className="text-xs text-slate-400">px</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1.5">상단 위치 (Top)</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={adTop}
                                                    onChange={e => setAdTop(e.target.value)}
                                                    placeholder="50%"
                                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <span className="text-xs text-slate-400">px/%</span>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-2">* 상단 위치에 %를 사용하면 화면 중앙 정렬이 용이합니다 (예: 50%).</p>
                                </div>

                            </div>

                            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                                <button
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isLoading ? "저장 중..." : <><Save size={18} /> 설정 저장하기</>}
                                </button>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
                            <AlertTriangle size={20} className="text-yellow-600 mt-0.5" />
                            <div className="text-sm text-yellow-800">
                                <strong>주의사항:</strong><br />
                                쿠팡 파트너스 활동은 공정위 심사 지침에 따라 "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." 문구를 반드시 표기해야 합니다. 배너 내에 포함되어 있는지 확인하세요.
                            </div>
                        </div>

                    </>
                )}

            </main>
        </div>
    );
};
