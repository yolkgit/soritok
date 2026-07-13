import { Metadata } from 'next';

export const metadata: Metadata = {
    title: '사이트 소개 - Aquado',
    description: '아쿠아도는 안전하고 행복한 물생활을 돕기 위해 전문적인 사육 정보와 생물 도감을 제공하는 공간입니다.',
};

export default function AboutPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="prose prose-invert lg:prose-xl mx-auto">
                <h1 className="text-4xl font-bold mb-6 text-white text-center">About Aquado</h1>
                <h2 className="text-2xl font-semibold mb-4 text-emerald-400 text-center">안전하고 행복한 물생활의 시작</h2>

                <div className="bg-slate-800/50 p-8 rounded-2xl shadow-xl border border-slate-700/50 mt-8 space-y-6 text-slate-300 leading-relaxed">
                    <p>
                        <strong>아쿠아도(Aquado)</strong>는 누구나 쉽고 올바르게 수중 생물을 기를 수 있도록 돕는
                        '물생활 취미 정보 센터'입니다.
                    </p>

                    <p>
                        처음 열대어를 입양하는 초보자부터 전문 브리더까지,
                        아쿠아도는 <strong>가장 정확하고 직관적인 생물 도감과 사육 정보</strong>를 제공합니다.
                        수질 정보(pH), 적정 수온, 어항 최소 크기, 올바른 합사 가이드 등 생물들이
                        건강하고 행복하게 살아가는 데 필요한 필수 지식들을 포켓몬 도감을 보는 것처럼
                        재미있고 직관적으로 찾아볼 수 있습니다.
                    </p>

                    <h3 className="text-xl font-bold text-white mt-6 mb-3 border-b border-slate-700 pb-2">우리의 미션</h3>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>정확하고 신뢰할 수 있는 사육 가이드라인을 제공합니다.</li>
                        <li>부적절한 사육 환경으로 인한 생물의 폐사를 줄입니다.</li>
                        <li>아름다운 개체 사진과 위키를 통해 물생활의 매력을 널리 알립니다.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
