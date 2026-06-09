import React from 'react';
import { X, Type, Check } from 'lucide-react';
import { FontConfig, ChildProfile } from '../types';

interface FontSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: FontConfig;
  onUpdate: (newConfig: FontConfig) => void;
  activeChild: ChildProfile;
  onUpdateChild: (child: ChildProfile) => void;
}

const FONTS = [
  { family: "'Noto Sans KR', sans-serif", label: "기본 (고딕)", class: "font-noto" },
  { family: "'Jua', sans-serif", label: "동글동글 (주아)", class: "font-jua" },
  { family: "'Gaegu', cursive", label: "개구쟁이", class: "font-gaegu" },
  { family: "'Nanum Pen Script', cursive", label: "손글씨 (펜)", class: "font-nanum-pen" },
];

export const FontSettingsModal: React.FC<FontSettingsModalProps> = ({ 
    isOpen, onClose, config, onUpdate
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden transform transition-all scale-100 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <Type size={20} className="text-slate-300" />
                글자 및 화면 설정
            </h3>
            <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
            {/* Font Family Selection */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">글씨체 선택</label>
                <div className="grid grid-cols-1 gap-2">
                    {FONTS.map((font) => (
                        <button
                            key={font.family}
                            onClick={() => onUpdate({ ...config, family: font.family, label: font.label })}
                            className={`
                                flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all
                                ${config.family === font.family 
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                                    : 'border-slate-100 hover:border-slate-200 text-slate-600 hover:bg-slate-50'}
                            `}
                        >
                            <span className={`text-lg ${font.class}`}>{font.label}</span>
                            {config.family === font.family && <Check size={20} className="text-indigo-600" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Font Size Selection */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">글자 크기</label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    {[0, 1, 2].map((level) => (
                        <button
                            key={level}
                            onClick={() => onUpdate({ ...config, sizeLevel: level as 0 | 1 | 2 })}
                            className={`
                                flex-1 py-2 rounded-lg text-sm font-bold transition-all
                                ${config.sizeLevel === level 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-600'}
                            `}
                        >
                            {level === 0 ? '작게' : level === 1 ? '보통' : '크게'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                <p 
                    style={{ fontFamily: config.family }}
                    className={`text-slate-700 transition-all ${
                        config.sizeLevel === 0 ? 'text-sm' : config.sizeLevel === 1 ? 'text-base' : 'text-lg'
                    }`}
                >
                    우리 아이 주간 계획표<br/>
                    오늘도 힘내세요!
                </p>
            </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
            <button 
                onClick={onClose}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md"
            >
                설정 완료
            </button>
        </div>
      </div>
    </div>
  );
};