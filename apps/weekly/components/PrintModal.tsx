import React from 'react';
import { X, Download, Loader2 } from 'lucide-react';

interface PrintModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDownloadPdf: () => void;
    previewUrl: string | null;
    isPdfGenerating: boolean;
}

export const PrintModal: React.FC<PrintModalProps> = ({
    isOpen,
    onClose,
    onDownloadPdf,
    previewUrl,
    isPdfGenerating
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in no-print">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">계획표 인쇄/저장 미리보기</h3>
                        <p className="text-sm text-slate-500 mt-0.5">캡처된 영역이 어떻게 저장될지 알 수 있습니다.</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Preview */}
                <div className="flex-1 overflow-auto p-6 bg-slate-50 flex items-center justify-center relative min-h-[300px]">
                    {isPdfGenerating ? (
                        <div className="flex flex-col items-center text-indigo-500">
                            <Loader2 size={40} className="animate-spin mb-4" />
                            <p className="font-bold">화면을 분석하고 있습니다...</p>
                            <p className="text-sm text-slate-500 mt-1">이미지가 많을 경우 조금 더 걸릴 수 있습니다.</p>
                        </div>
                    ) : previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="계획표 미리보기"
                            className="max-w-full h-auto bg-white shadow-md border border-slate-200 rounded object-contain"
                        />
                    ) : (
                        <div className="text-slate-400 font-medium">
                            미리보기를 생성하지 못했습니다. 다시 시도해주세요.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 bg-white border-t border-slate-100 flex items-center justify-between shrink-0 gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        취소 / 다시 캡처
                    </button>

                    <button
                        onClick={onDownloadPdf}
                        disabled={isPdfGenerating || !previewUrl}
                        className={`
              flex flex-1 md:flex-none items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg
              ${(isPdfGenerating || !previewUrl)
                                ? 'bg-indigo-300 cursor-not-allowed shadow-none text-white/80'
                                : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 text-white active:scale-95'}
            `}
                    >
                        {isPdfGenerating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                생성 중...
                            </>
                        ) : (
                            <>
                                <Download size={18} />
                                PDF 다운로드
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
};
