import React, { useEffect, useState } from 'react';

interface AdSidebarProps {
    side: 'left' | 'right';
    config: Record<string, string>;
    isPremium: boolean;
}

export const AdSidebar: React.FC<AdSidebarProps> = ({ side, config, isPremium }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if ads are globally enabled and user is not premium
        const adsEnabled = config['ADS_ENABLED'] === 'true';
        setIsVisible(adsEnabled && !isPremium);
    }, [config, isPremium]);

    if (!isVisible) return null;

    // Get specific ad code based on side
    // In a real scenario, you might have 'ADSENSE_LEFT_ID' vs 'ADSENSE_RIGHT_ID'
    // For now, we'll just use a generic slot or the raw script from config
    const adCode = config['COUPANG_BANNER_HTML'] || config['ADSENSE_SLOT_ID'];
    const isCoupang = !!config['COUPANG_BANNER_HTML'];

    // Layout from config
    const width = config['AD_SIDEBAR_WIDTH'] || '160';
    const height = config['AD_SIDEBAR_HEIGHT'] || '600';
    const margin = config['AD_SIDEBAR_MARGIN'] || '16';
    const top = config['AD_SIDEBAR_TOP'] || '50%';

    return (
        <div
            className={`
                fixed hidden xl:flex flex-col items-center justify-between
                bg-slate-100 border border-slate-200 rounded-lg shadow-sm overflow-hidden z-30 no-print
            `}
            style={{
                width: width.endsWith('px') || width.endsWith('%') ? width : `${width}px`,
                height: height.endsWith('px') || height.endsWith('%') ? height : `${height}px`,
                top: top.endsWith('px') || top.endsWith('%') ? top : `${top}px`,
                left: side === 'right' ? `calc(50% + 576px + ${margin.endsWith('px') || margin.endsWith('%') ? margin : `${margin}px`})` : 'auto',
                right: side === 'left' ? `calc(50% + 576px + ${margin.endsWith('px') || margin.endsWith('%') ? margin : `${margin}px`})` : 'auto',
                transform: top.includes('%') ? 'translateY(-50%)' : 'none'
            }}
        >
            <div className="text-[10px] text-slate-400 p-1 uppercase tracking-wider bg-slate-50 w-full text-center border-b border-slate-200 shrink-0">
                Advertisement
            </div>

            {/* Ad Content */}
            <div className="flex-1 w-full flex items-center justify-center p-1 overflow-hidden">
                {isCoupang ? (
                    <div dangerouslySetInnerHTML={{ __html: adCode }} className="scale-90" />
                ) : (
                    /* AdSense Placeholder / Script execution would go here */
                    <div className="text-center text-slate-400 text-xs p-4">
                        <p className="font-bold">Google AdSense</p>
                        <p className="mt-2 text-[10px] break-all">{adCode || 'No Ad Code Configured'}</p>
                    </div>
                )}
            </div>

            {/* Disclosure */}
            {isCoupang && (
                <div className="p-2 bg-slate-50 border-t border-slate-200 w-full shrink-0">
                    <p className="text-[9px] text-slate-400 leading-tight text-center">
                        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
                    </p>
                </div>
            )}
        </div>
    );
};
