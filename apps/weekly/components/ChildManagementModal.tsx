import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, User, AlertTriangle, GraduationCap, School, Baby } from 'lucide-react';
import { ChildProfile, GradeLevel } from '../types';
import { generateId } from '../constants';

interface ChildManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    childrenList: ChildProfile[];

    onAddChild: (child: ChildProfile) => Promise<void>;
    onEditChild: (child: ChildProfile) => Promise<void>;
    onDeleteChild: (childId: string) => Promise<void>;
    activeChildId: string;
    setActiveChildId: (id: string) => void;
}

// Colors for children profiles
const CHILD_COLORS = ['indigo', 'emerald', 'rose', 'amber', 'cyan', 'purple', 'fuchsia', 'lime'];

export const ChildManagementModal: React.FC<ChildManagementModalProps> = ({
    isOpen, onClose, childrenList, onAddChild, onEditChild, onDeleteChild, activeChildId, setActiveChildId
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editGrade, setEditGrade] = useState<GradeLevel>('elementary');

    // State for delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleAddChild = async () => {
        const newColor = CHILD_COLORS[childrenList.length % CHILD_COLORS.length];
        const newChild: ChildProfile = {
            id: generateId(),
            name: '새로운 아이',
            color: newColor,
            grade: 'elementary',
            startTime: '07:00', // Defaults
            endTime: '22:00'
        };

        await onAddChild(newChild);

        // Automatically start editing the new child
        setEditingId(newChild.id);
        setEditName(newChild.name);
        setEditGrade('elementary');
        setDeleteConfirmId(null);
    };

    const handleStartEdit = (child: ChildProfile) => {
        setEditingId(child.id);
        setEditName(child.name);
        setEditGrade(child.grade || 'elementary');
        setDeleteConfirmId(null);
    };

    const handleSaveEdit = async () => {
        if (editingId && editName.trim()) {
            const childToUpdate = childrenList.find(c => c.id === editingId);
            if (childToUpdate) {
                await onEditChild({ ...childToUpdate, name: editName.trim(), grade: editGrade });
            }
            setEditingId(null);
            setEditName('');
        }
    };

    const handleDeleteClick = async (childId: string) => {
        if (childrenList.length <= 1) {
            alert("최소 한 명의 아이는 있어야 합니다.");
            return;
        }

        if (deleteConfirmId === childId) {
            // Confirmed
            await onDeleteChild(childId);
            setDeleteConfirmId(null);
        } else {
            // First click
            setDeleteConfirmId(childId);
            // Auto reset after 3s
            setTimeout(() => setDeleteConfirmId(null), 3000);
        }
    };

    const getColorClass = (color: string) => {
        switch (color) {
            case 'indigo': return 'bg-indigo-100 text-indigo-700';
            case 'emerald': return 'bg-emerald-100 text-emerald-700';
            case 'rose': return 'bg-rose-100 text-rose-700';
            case 'amber': return 'bg-amber-100 text-amber-700';
            case 'cyan': return 'bg-cyan-100 text-cyan-700';
            case 'purple': return 'bg-purple-100 text-purple-700';
            case 'fuchsia': return 'bg-fuchsia-100 text-fuchsia-700';
            case 'lime': return 'bg-lime-100 text-lime-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getGradeLabel = (grade: GradeLevel) => {
        switch (grade) {
            case 'elementary': return '초등';
            case 'middle': return '중등';
            case 'high': return '고등';
            default: return '초등';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">

                {/* Header */}
                <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <User size={20} className="text-indigo-300" />
                        아이 프로필 관리
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* List */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                    {childrenList.map((child) => (
                        <div key={child.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50 relative">
                            <div className="flex items-start gap-3">
                                {/* Icon/Color */}
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${getColorClass(child.color)}`}>
                                    {child.name.charAt(0)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 space-y-2">
                                    {editingId === child.id ? (
                                        <div className="space-y-3">
                                            {/* Name Edit */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">이름</label>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                                    autoFocus
                                                />
                                            </div>

                                            {/* Grade Edit */}
                                            <div>
                                                <label className="text-xs font-bold text-slate-500 block mb-1">학년 단계 (추천 계획표용)</label>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditGrade('elementary')}
                                                        className={`flex-1 py-2 text-xs rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${editGrade === 'elementary' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                    >
                                                        <Baby size={16} />
                                                        초등 (1~6)
                                                    </button>
                                                    <button
                                                        onClick={() => setEditGrade('middle')}
                                                        className={`flex-1 py-2 text-xs rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${editGrade === 'middle' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                    >
                                                        <School size={16} />
                                                        중등 (1~3)
                                                    </button>
                                                    <button
                                                        onClick={() => setEditGrade('high')}
                                                        className={`flex-1 py-2 text-xs rounded-lg border font-bold flex flex-col items-center gap-1 transition-all ${editGrade === 'high' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                                    >
                                                        <GraduationCap size={16} />
                                                        고등 (1~3)
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Save Button */}
                                            <button
                                                onClick={handleSaveEdit}
                                                className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2 mt-2"
                                            >
                                                <Check size={16} /> 저장 완료
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-bold text-lg text-slate-800">{child.name}</div>
                                                <span className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-500 font-medium">
                                                    {getGradeLabel(child.grade || 'elementary')}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-1">
                                                {activeChildId === child.id ? '🔵 현재 선택된 아이' : '⚪ 선택되지 않음'}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions (Only when not editing) */}
                                {editingId !== child.id && (
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => handleStartEdit(child)}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="수정"
                                        >
                                            <Edit2 size={18} />
                                        </button>

                                        <button
                                            onClick={() => handleDeleteClick(child.id)}
                                            className={`
                                        p-2 rounded-lg transition-all flex items-center justify-center
                                        ${deleteConfirmId === child.id
                                                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse w-8'
                                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}
                                    `}
                                            title={deleteConfirmId === child.id ? "클릭하여 삭제 확정" : "삭제"}
                                        >
                                            {deleteConfirmId === child.id ? <AlertTriangle size={18} /> : <Trash2 size={18} />}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleAddChild}
                        className="w-full py-3 mt-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} />
                        새로운 아이 추가하기
                    </button>
                </div>

                <div className="bg-slate-50 p-4 text-center text-xs text-slate-400 border-t border-slate-100">
                    * 아이 프로필 수정에서 학년을 변경해도 기존 계획표는 유지됩니다.<br />
                    계획표를 변경하려면 메인 화면의 '추천 계획표 불러오기'를 사용하세요.
                </div>
            </div>
        </div>
    );
};