import React from 'react';

interface AdMobileBottomProps {
    config?: Record<string, string>;
    isPremium: boolean;
}

export const AdMobileBottom: React.FC<AdMobileBottomProps> = ({ config = {}, isPremium }) => {
    // 프리미엄 유저이거나 설정상 광고가 꺼져있으면 렌더링하지 않음
    if (isPremium || config['ADS_ENABLED'] !== 'true') return null;

    return (
        <div className="fixed bottom-0 left-0 w-full z-40 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] flex justify-center items-center overflow-hidden xl:hidden print:hidden min-h-[60px]">
            <div className="w-full flex justify-center items-center overflow-hidden h-full">
                {/* 광고 슬롯 */}
                {config['COUPANG_MOBILE_HTML'] ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: config['COUPANG_MOBILE_HTML'] }}
                        className="w-full max-w-sm flex justify-center scale-90"
                    />
                ) : config['ADSENSE_MOBILE_ID'] ? (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                        {/* AdSense Placeholder / Script execution would go here */}
                        <div className="text-center text-slate-400 text-xs p-2">
                            <p className="font-bold">Google AdSense</p>
                            <p className="mt-1 text-[10px] break-all">{config['ADSENSE_MOBILE_ID']}</p>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-[60px] bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                        모바일 하단 배너 설정 필요
                    </div>
                )}
            </div>
        </div>
    );
};
