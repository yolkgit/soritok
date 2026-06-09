import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface AdInterstitialProps {
    isOpen: boolean;
    onClose: () => void;
    config: Record<string, string>;
    isPremium: boolean;
}

const AdContent = React.memo(({ adCode, height }: { adCode: string; height: string }) => {
    return (
        <div
            className="w-full bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200 mb-6 overflow-hidden"
            style={{
                height: height.includes('%') ? height : `${height}px`,
                maxHeight: 'calc(100vh - 15rem)'
            }}
        >
            {adCode ? (
                <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: adCode }}
                />
            ) : (
                <div className="text-center text-slate-400 text-sm p-4">
                    <p>전면 광고 영역</p>
                    <p className="mt-2 text-xs opacity-70">광고 코드가 설정되지 않았습니다</p>
                </div>
            )}
        </div>
    );
});

export const AdInterstitial: React.FC<AdInterstitialProps> = ({ isOpen, onClose, config, isPremium }) => {
    const configTimer = parseInt(config['AD_INTERSTITIAL_TIMER'] || '3');
    const configWidth = config['AD_INTERSTITIAL_WIDTH'] || '512';
    const configHeight = config['AD_INTERSTITIAL_HEIGHT'] || '512';

    const [timer, setTimer] = useState(configTimer);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (isOpen && !isPremium) {
            setTimer(configTimer);
            setCanClose(configTimer <= 0);

            if (configTimer > 0) {
                const interval = setInterval(() => {
                    setTimer((prev) => {
                        if (prev <= 1) {
                            setCanClose(true);
                            clearInterval(interval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
                return () => clearInterval(interval);
            }
        }
    }, [isOpen, configTimer]);

    if (!isOpen || isPremium) return null;

    const adCode = config['COUPANG_INTERSTITIAL_HTML'] || config['ADSENSE_INTERSTITIAL_ID'] || '';

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in no-print">
            <div
                className="bg-white rounded-2xl shadow-2xl overflow-hidden relative flex flex-col items-center p-6"
                style={{
                    width: configWidth.includes('%') ? configWidth : `${configWidth}px`,
                    maxWidth: 'calc(100vw - 2rem)'
                }}
            >

                <h3 className="text-lg font-bold text-slate-800 mb-4">잠시 광고를 보고 가실게요! 🙇‍♂️</h3>

                {/* Ad Container - Memoized to prevent refresh on timer state change */}
                <AdContent adCode={adCode} height={configHeight} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    disabled={!canClose}
                    className={`
                        w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2
                        ${canClose
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg hover:shadow-xl cursor-pointer'
                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
                    `}
                >
                    {canClose ? (
                        <>
                            <span>닫고 계속하기</span>
                            <X size={18} />
                        </>
                    ) : (
                        <span>{timer}초 뒤에 닫을 수 있어요</span>
                    )}
                </button>

                <div className="mt-4 text-[10px] text-slate-400 text-center leading-relaxed">
                    이 포스팅은 쿠팡 파트너스 활동의 일환으로,<br />이에 따른 일정액의 수수료를 제공받습니다.
                </div>
            </div>
        </div>
    );
};
