export default function ContactPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="prose prose-invert prose-indigo mx-auto bg-slate-800/50 p-6 md:p-12 rounded-2xl shadow-xl border border-slate-700/50 text-center">
                <h1 className="text-3xl font-bold text-white mb-6">문의하기</h1>

                <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                    Aquado 서비스 이용 중 궁금한 점이 있으시거나, 도감 정보 수정,
                    <br className="hidden sm:block" /> 제휴 및 광고 관련 문의가 있으시면 아래 메일로 연락해 주세요.
                </p>

                <div className="bg-slate-900 overflow-hidden shadow sm:rounded-lg max-w-md mx-auto w-full inline-block border border-slate-700/50">
                    <div className="px-4 py-8 sm:px-6">
                        <h3 className="text-base leading-6 font-semibold text-emerald-400 mb-2">관리자 이메일</h3>
                        <p className="mt-1 text-2xl text-white font-mono bg-slate-800 p-4 rounded-lg inline-block select-all">
                            admin@aquado.com
                        </p>
                    </div>
                </div>

                <p className="mt-10 text-sm text-slate-500">
                    보내주신 의견은 꼼꼼히 검토하여 더욱 발전하는 Aquado가 되겠습니다.
                </p>
            </div>
        </div>
    );
}
