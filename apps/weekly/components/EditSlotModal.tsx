import React, { useState, useEffect } from 'react';
import { TimeSlot, ActivityType } from '../types';
import { X, Check, Trash2, Clock, Sparkles, Layers, AlertTriangle } from 'lucide-react';

interface EditSlotModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Partial<TimeSlot>) => void;
    onDelete: (id: string) => void;
    initialData?: TimeSlot;
    dayName: string;
    timeStr: string;
    selectionCount?: number;
}

const ACTIVITY_TYPES: { type: ActivityType; label: string; color: string }[] = [
    { type: 'study', label: '공부/학습 (보상↑)', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
    { type: 'academy', label: '학원/예체능', color: 'bg-orange-100 border-orange-300 text-orange-800' },
    { type: 'school', label: '학교/등교', color: 'bg-rose-100 border-rose-300 text-rose-800' },
    { type: 'routine', label: '생활습관 (밥/씻기)', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    { type: 'rest', label: '휴식/자유시간', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { type: 'sleep', label: '수면/취침', color: 'bg-slate-100 border-slate-300 text-slate-800' },
];

// Predefined activities for quick selection
const RECOMMENDED_ACTIVITIES: Record<ActivityType, string[]> = {
    study: ['수학 문제집 풀기', '영어 단어 암기', '독서 (30분)', '학교 숙제', '온라인 강의', '학습지 풀기', '일기 쓰기', '받아쓰기 연습'],
    academy: ['영어 학원', '수학 학원', '태권도', '피아노 학원', '미술 학원', '논술 학원', '축구 교실', '수영장'],
    school: ['학교 수업', '방과후 수업', '등교 준비', '하교', '동아리 활동', '0교시 자습', '야간 자율 학습'],
    routine: ['아침 식사', '점심 식사', '저녁 식사', '세수 & 양치', '샤워', '방 청소', '내일 준비', '이불 정리'],
    rest: ['TV 보기', '유튜브 시청', '모바일 게임', '친구랑 놀기', '낮잠', '간식 타임', '가족과 대화', '보드게임'],
    sleep: ['취침', '꿈나라 여행', '낮잠']
};

export const EditSlotModal: React.FC<EditSlotModalProps> = ({
    isOpen, onClose, onSave, onDelete, initialData, dayName, timeStr, selectionCount
}) => {
    const [activity, setActivity] = useState('');
    const [type, setType] = useState<ActivityType>('rest');
    const [isDeleting, setIsDeleting] = useState(false);
    const [recentActivities, setRecentActivities] = useState<string[]>([]);

    // Load recent activities
    useEffect(() => {
        try {
            const saved = localStorage.getItem('weekly_paper_recent_activities');
            if (saved) {
                setRecentActivities(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Failed to load recent activities", e);
        }
    }, [isOpen]); // Reload when modal opens to get latest


    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setActivity(initialData.activity);
                setType(initialData.type);
            } else {
                setActivity('');
                setType('rest');
            }
            setIsDeleting(false); // Reset delete state on open
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        // If empty input, confirm deletion (if it's an existing slot or batch edit)
        if (!activity.trim()) {
            if (initialData || isBatchMode) {
                setIsDeleting(true); // Switch delete button to confirm mode to guide user
                return;
            } else {
                // New slot with empty text, just close
                onClose();
                return;
            }
        }

        // Status is reset to pending when edited because the plan changed
        onSave({
            activity,
            type,
            status: 'pending'
        });

        // Save to Recent Activities
        if (activity.trim()) {
            try {
                const newRecent = [activity.trim(), ...recentActivities.filter(a => a !== activity.trim())].slice(0, 8); // Keep max 8
                localStorage.setItem('weekly_paper_recent_activities', JSON.stringify(newRecent));
            } catch (e) {
                console.error("Failed to save recent activity", e);
            }
        }

        onClose();
    };

    const handleDeleteClick = () => {
        if (isDeleting) {
            // Confirmed
            onDelete(initialData?.id || '');
            onClose();
        } else {
            // First click
            setIsDeleting(true);
        }
    };

    const handleRecommendationClick = (text: string) => {
        setActivity(text);
    };

    const isBatchMode = selectionCount && selectionCount > 1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100 max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            {isBatchMode ? <Layers size={18} className="text-indigo-200" /> : <Clock size={18} className="text-indigo-200" />}
                            {dayName} {timeStr}
                        </h3>
                        {isBatchMode && (
                            <p className="text-indigo-200 text-xs mt-1">
                                총 {selectionCount}개의 시간대를 한 번에 수정합니다.
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto">

                    {/* Select: Type */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">어떤 활동인가요?</label>
                        <div className="grid grid-cols-2 gap-2">
                            {ACTIVITY_TYPES.map((t) => (
                                <button
                                    key={t.type}
                                    onClick={() => setType(t.type)}
                                    className={`
                                text-xs sm:text-sm px-3 py-3 rounded-lg border-2 transition-all flex items-center justify-center font-medium
                                ${type === t.type ? t.color : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}
                            `}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Input: Activity Name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">무엇을 하나요?</label>

                        {/* Recommendation Chips */}
                        <div className="mb-3">
                            <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 mb-2">
                                <Sparkles size={12} />
                                <span>빠른 선택 (클릭시 자동 입력)</span>

                            </div>

                            {/* Recent Activities Section */}
                            {recentActivities.length > 0 && (
                                <div className="mb-2">
                                    <div className="text-[10px] text-slate-400 font-medium mb-1 ml-1">최근 사용</div>
                                    <div className="flex flex-wrap gap-2">
                                        {recentActivities.map((item, idx) => (
                                            <button
                                                key={`recent-${idx}`}
                                                onClick={() => handleRecommendationClick(item)}
                                                className={`
                                            px-2 py-1 rounded-md text-xs font-medium border transition-colors flex items-center gap-1
                                            ${activity === item
                                                        ? 'bg-slate-700 text-white border-slate-700'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}
                                        `}
                                            >
                                                <Clock size={10} />
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="text-[10px] text-slate-400 font-medium mb-1 ml-1">추천 활동</div>
                            <div className="flex flex-wrap gap-2">
                                {RECOMMENDED_ACTIVITIES[type].map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleRecommendationClick(item)}
                                        className={`
                                    px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors
                                    ${activity === item
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'}
                                `}
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <input
                            type="text"
                            value={activity}
                            onChange={(e) => setActivity(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSave();
                                }
                            }}
                            placeholder="직접 입력하거나 위에서 선택하세요"
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all text-slate-800 font-medium"
                        />
                    </div>


                    <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-lg">
                        💡 팁: 내용을 비우고 저장하면 일정이 삭제됩니다.
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center shrink-0">
                    {initialData || isBatchMode ? (
                        <button
                            onClick={handleDeleteClick}
                            className={`
                        p-2 rounded-lg transition-all flex items-center gap-1 text-sm font-medium
                        ${isDeleting
                                    ? 'bg-red-500 text-white hover:bg-red-600 px-3 shadow-md animate-pulse'
                                    : 'text-red-400 hover:text-red-600 hover:bg-red-50'}
                    `}
                        >
                            {isDeleting ? <><AlertTriangle size={16} /> 정말 삭제할까요?</> : <><Trash2 size={16} /> 삭제</>}
                        </button>
                    ) : (
                        <div></div>
                    )}

                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-200 rounded-lg transition-colors">
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                        >
                            <Check size={18} />
                            저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};