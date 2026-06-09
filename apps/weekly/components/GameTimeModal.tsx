
import React, { useState } from 'react';
import { X, Gamepad2, MinusCircle, RotateCcw, Settings, Coins, Clock, History, Calendar, AlertTriangle, Lock, Edit3, Trash2 } from 'lucide-react';
import { RewardMode, PointUsageLog, RewardConfig, ActivityType } from '../types';

interface GameTimeModalProps {
    isOpen: boolean;
    onClose: () => void;
    earnedPoints: number;
    usedPoints: number;
    onUsePoints: (amount: number) => void;
    onResetUsed: () => void;

    rewardConfig?: RewardConfig;
    onRewardConfigChange?: (config: RewardConfig) => void;
    usageLogs: PointUsageLog[];
    isParentMode: boolean;
    onDeleteLog?: (logId: string) => void;
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
    study: '공부/학습',
    academy: '학원/예체능',
    school: '학교/등교',
    routine: '생활습관',
    rest: '휴식/자유',
    sleep: '수면/취침'
};

export const GameTimeModal: React.FC<GameTimeModalProps> = ({
    isOpen, onClose, earnedPoints, usedPoints, onUsePoints, onResetUsed,
    rewardConfig, onRewardConfigChange,
    usageLogs, isParentMode, onDeleteLog
}) => {
    const [customAmount, setCustomAmount] = useState('');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isResetConfirming, setIsResetConfirming] = useState(false);

    // Local state for editing
    const [localConfig, setLocalConfig] = useState<RewardConfig>(rewardConfig || {
        mode: 'time', unit: '포인트', study: 0, academy: 0, school: 0, routine: 0, rest: 0, sleep: 0
    });

    // Sync when prop changes (only if not editing? or always? always for now)
    React.useEffect(() => {
        if (rewardConfig) setLocalConfig(rewardConfig);
    }, [rewardConfig]);

    if (!isOpen) return null;

    const currentBalance = earnedPoints - usedPoints;
    const rewardMode = localConfig.mode;
    const currencyUnit = localConfig.unit;

    // Helpers for display
    const formatValue = (value: number) => {
        if (rewardMode === 'time') {
            const isNegative = value < 0;
            const absVal = Math.abs(value);
            const h = Math.floor(absVal / 60);
            const m = absVal % 60;
            return `${isNegative ? '-' : ''}${h}시간 ${m}분`;
        } else {
            return `${value} ${currencyUnit}`;
        }
    };

    const formatLogValue = (value: number) => {
        if (rewardMode === 'time') {
            const h = Math.floor(value / 60);
            const m = value % 60;
            if (h > 0) return `${h}시간 ${m}분`;
            return `${m}분`;
        } else {
            return `${value} ${currencyUnit}`;
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${month}.${day} ${hours}:${minutes}`;
    };

    const handleCustomDeduct = () => {
        const amount = parseInt(customAmount);
        if (!isNaN(amount) && amount > 0) {
            onUsePoints(amount);
            setCustomAmount('');
        }
    };

    const handleResetClick = () => {
        if (isResetConfirming) {
            onResetUsed();
            setIsResetConfirming(false);
        } else {
            setIsResetConfirming(true);
            setTimeout(() => setIsResetConfirming(false), 3000);
        }
    };

    const handleConfigChange = (field: keyof RewardConfig, value: any) => {
        setLocalConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveSettings = () => {
        if (onRewardConfigChange) {
            onRewardConfigChange(localConfig);
            alert("설정이 저장되었습니다.");
            setIsSettingsOpen(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        {rewardMode === 'time' ? <Gamepad2 size={20} className="text-yellow-400" /> : <Coins size={20} className="text-yellow-400" />}
                        {rewardMode === 'time' ? '게임/미디어 시간' : '보상 지갑'}
                    </h3>
                    <div className="flex items-center gap-2">
                        {isParentMode && (
                            <button
                                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                className={`p-2 rounded-full transition-colors ${isSettingsOpen ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                            >
                                <Settings size={20} />
                            </button>
                        )}
                        <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="overflow-y-auto">
                    {/* Settings Section (Toggleable & Parent Only) */}
                    {isSettingsOpen && isParentMode && (
                        <div className="bg-slate-100 p-4 border-b border-slate-200 animate-fade-in-down">
                            <h4 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                                <Settings size={14} /> 보상 설정
                            </h4>

                            <div className="space-y-4">
                                {/* Mode Toggle */}
                                <div className="flex p-1 bg-white rounded-xl border border-slate-200">
                                    <button
                                        onClick={() => handleConfigChange('mode', 'time')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${rewardMode === 'time' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <Clock size={14} /> 시간제 (분)
                                    </button>
                                    <button
                                        onClick={() => handleConfigChange('mode', 'currency')}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${rewardMode === 'currency' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        <Coins size={14} /> 화폐제 (포인트)
                                    </button>
                                </div>

                                {/* Unit Name Input (Currency Only) */}
                                {rewardMode === 'currency' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1">화폐 단위 이름</label>
                                        <input
                                            type="text"
                                            value={currencyUnit}
                                            onChange={(e) => handleConfigChange('unit', e.target.value)}
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="예: 골드, 젤리, 포인트"
                                        />
                                    </div>
                                )}

                                {/* Reward Points Config */}
                                <div className="bg-white p-3 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                        <Edit3 size={12} /> 활동별 보상 점수 설정 (성공 시)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['study', 'academy', 'school', 'routine', 'rest', 'sleep'] as ActivityType[]).map(type => (
                                            <div key={type} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                                                <span className="text-xs font-medium text-slate-600">{ACTIVITY_LABELS[type]}</span>
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={localConfig[type]}
                                                        onChange={(e) => handleConfigChange(type, parseInt(e.target.value) || 0)}
                                                        className="w-12 text-right text-sm font-bold bg-white border border-slate-300 rounded px-1 py-0.5 focus:border-indigo-500 outline-none"
                                                    />
                                                    <span className="text-xs text-slate-400">{rewardMode === 'time' ? '분' : '점'}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveSettings}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                                >
                                    <Settings size={18} />
                                    설정 저장하기
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Dashboard */}
                    <div className="p-6 bg-slate-50 border-b border-slate-100">
                        <div className="grid grid-cols-3 gap-2 text-center mb-6">
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 font-bold mb-1">총 획득</div>
                                <div className="text-indigo-600 font-bold text-sm sm:text-base">{formatValue(earnedPoints)}</div>
                            </div>
                            <div className="flex flex-col justify-center items-center">
                                <div className="w-6 h-1 bg-slate-300 rounded-full mb-1"></div>
                                <div className="text-xs text-slate-400 font-bold">마이너스</div>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-100">
                                <div className="text-xs text-slate-500 font-bold">이미 사용</div>
                                <div className="text-rose-500 font-bold text-sm sm:text-base">{formatValue(usedPoints)}</div>
                            </div>
                        </div>

                        <div className="text-center bg-indigo-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="text-indigo-200 text-sm font-bold mb-1 uppercase tracking-wider">현재 잔액</div>
                                <div className="text-4xl font-black">{formatValue(currentBalance)}</div>
                            </div>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                        </div>
                    </div>

                    {/* Actions (Parent Only) */}
                    {isParentMode ? (
                        <div className="p-6 pb-2">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <MinusCircle size={16} className="text-rose-500" />
                                    {rewardMode === 'time' ? '시간 차감하기 (사용)' : '포인트 차감하기 (사용)'}
                                </label>

                                {/* Presets based on Mode */}
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    {rewardMode === 'time' ? (
                                        <>
                                            <button onClick={() => onUsePoints(10)} className="py-3 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">- 10분</button>
                                            <button onClick={() => onUsePoints(30)} className="py-3 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">- 30분</button>
                                            <button onClick={() => onUsePoints(60)} className="py-3 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">- 1시간</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => onUsePoints(10)} className="py-3 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">- 10 {currencyUnit}</button>
                                            <button onClick={() => onUsePoints(50)} className="py-3 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">- 50 {currencyUnit}</button>
                                            <button onClick={() => onUsePoints(100)} className="py-3 bg-white border border-slate-200 hover:border-rose-400 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl font-bold transition-all shadow-sm">- 100 {currencyUnit}</button>
                                        </>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        placeholder={rewardMode === 'time' ? "분 단위 입력" : "금액 입력"}
                                        className="flex-1 px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                                    />
                                    <button
                                        onClick={handleCustomDeduct}
                                        disabled={!customAmount}
                                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-slate-300 text-white font-bold rounded-xl transition-colors text-sm"
                                    >
                                        차감
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 pb-2 text-center">
                            <div className="bg-slate-100 rounded-xl p-4 flex flex-col items-center gap-2 text-slate-500">
                                <Lock size={24} className="text-slate-400" />
                                <p className="text-sm font-bold">포인트 관리 잠김</p>
                                <p className="text-xs">포인트 사용과 설정 변경은<br />부모님 모드에서만 가능해요.</p>
                            </div>
                        </div>
                    )}

                    {/* Logs Section */}
                    <div className="p-6 pt-2">
                        <div className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2 pt-4 border-t border-slate-100">
                            <History size={16} className="text-slate-400" />
                            최근 사용 기록
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-slate-100 max-h-40 overflow-y-auto">
                            {usageLogs.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    아직 사용 기록이 없습니다.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {usageLogs.map((log) => (
                                        <div key={log.id} className="flex justify-between items-center p-3 text-sm hover:bg-slate-100 transition-colors group">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <Calendar size={12} />
                                                <span className="text-xs">{formatDate(log.timestamp)}</span>
                                                {log.reason && <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{log.reason}</span>}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="font-bold text-rose-500">
                                                    - {formatLogValue(log.amount)}
                                                </div>
                                                {isParentMode && onDeleteLog && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm("이 기록을 삭제하시겠습니까? (차감된 포인트가 복구됩니다.)")) {
                                                                onDeleteLog(log.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="기록 삭제"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {isParentMode && (
                            <div className="pt-4 mt-2">
                                <button
                                    onClick={handleResetClick}
                                    className={`
                                w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-sm font-medium
                                ${isResetConfirming
                                            ? 'bg-red-50 text-red-600 font-bold border border-red-200 animate-pulse'
                                            : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}
                            `}
                                >
                                    {isResetConfirming ? (
                                        <>
                                            <AlertTriangle size={16} />
                                            정말 삭제하시겠습니까? (한번 더 클릭)
                                        </>
                                    ) : (
                                        <>
                                            <RotateCcw size={16} />
                                            사용 내역 초기화 (0으로 리셋)
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
