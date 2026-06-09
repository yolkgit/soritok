import React, { useState, useEffect } from 'react';
import { X, Delete, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface SecurityKeypadProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (password: string) => void;
    title?: string;
    description?: string;
    maxLength?: number;
    minLength?: number;
}

export const SecurityKeypad: React.FC<SecurityKeypadProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title = "부모님 모드 확인",
    description = "비밀번호를 입력해주세요.",
    maxLength = 8,
    minLength = 4
}) => {
    const [input, setInput] = useState("");
    const [numbers, setNumbers] = useState<number[]>([]);

    useEffect(() => {
        if (isOpen) {
            shuffleNumbers();
            setInput("");
        }
    }, [isOpen]);

    const shuffleNumbers = () => {
        const nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nums[i], nums[j]] = [nums[j], nums[i]];
        }
        setNumbers(nums);
    };

    const handleNumberClick = (num: number) => {
        if (input.length < maxLength) {
            setInput(prev => prev + num.toString());
        }
    };

    const handleDelete = () => {
        setInput(prev => prev.slice(0, -1));
    };

    const handleConfirm = () => {
        if (input.length >= minLength) {
            onConfirm(input);
        } else {
            alert(`최소 ${minLength}자리 이상 입력해주세요.`);
        }
    };

    const handleResetPassword = async () => {
        const loginPassword = prompt("메인 계정 비밀번호를 입력하세요");
        if (loginPassword) {
            try {
                await api.resetParentPassword(loginPassword);
                alert("0000으로 초기화되었습니다");
                onClose();
            } catch (error: any) {
                alert(error.message || '비밀번호 초기화 중 오류가 발생했습니다.');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 text-center border-b border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                        <div className="w-10"></div>
                        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">{description}</p>

                    {/* Password display blocks */}
                    <div className="flex justify-center gap-3 mb-2">
                        {[...Array(minLength)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${i < input.length ? 'bg-indigo-500 border-indigo-500 scale-110' : 'border-gray-200'
                                    }`}
                            />
                        ))}
                        {input.length > minLength && [...Array(input.length - minLength)].map((_, i) => (
                            <div
                                key={i + minLength}
                                className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-500 scale-110 animate-in zoom-in"
                            />
                        ))}
                    </div>
                    <div className="h-4 text-[10px] text-gray-400">
                        {input.length} / {maxLength}
                    </div>
                </div>

                <div className="p-6 bg-gray-50">
                    <div className="grid grid-cols-3 gap-3">
                        {numbers.map((num) => (
                            <button
                                key={num}
                                onClick={() => handleNumberClick(num)}
                                className="h-16 flex items-center justify-center bg-white border border-gray-200 rounded-xl text-2xl font-bold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 active:scale-95 transition-all shadow-sm"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={shuffleNumbers}
                            className="h-16 flex items-center justify-center bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                            title="재배치"
                        >
                            <RefreshCw size={24} />
                        </button>
                        <button
                            onClick={handleDelete}
                            className="h-16 flex items-center justify-center bg-gray-100 rounded-xl text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                            disabled={input.length === 0}
                        >
                            <Delete size={24} />
                        </button>
                    </div>

                    <button
                        onClick={handleConfirm}
                        disabled={input.length < minLength}
                        className={`w-full mt-6 py-4 rounded-xl font-bold text-lg shadow-lg transition-all active:scale-95 ${input.length >= minLength
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        확인
                    </button>

                    <button
                        onClick={handleResetPassword}
                        className="w-full mt-4 text-sm text-gray-500 hover:text-indigo-600 underline transition-colors"
                    >
                        비밀번호를 잊으셨나요?
                    </button>
                </div>
            </div>
        </div>
    );
};
