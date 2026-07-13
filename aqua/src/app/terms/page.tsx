export default function TermsPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="prose prose-invert prose-indigo mx-auto bg-slate-800/50 p-6 md:p-12 rounded-2xl shadow-xl border border-slate-700/50 text-slate-300">
                <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-700 pb-4">이용약관</h1>

                <div className="space-y-6 text-sm leading-relaxed">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제1조 (목적)</h2>
                        <p>본 약관은 Aquado(이하 "회사" 또는 "서비스")가 제공하는 모든 서비스의 이용조건 및 절차, 이용자와 회사의 권리, 의무, 책임사항과 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제2조 (저작권 및 지적재산권)</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>서비스 내의 모든 디자인, 텍스트, 사용자 인터페이스, 이미지 등은 회사의 자산입니다.</li>
                            <li>사용자는 회사의 사전 동의 없이 서비스의 콘텐츠를 상업적으로 복사, 수정, 배포할 수 없습니다.</li>
                            <li>AI를 통해 생성된 어종 설명과 이미지는 참고용이며, 회사는 이에 대한 활용으로 발생하는 문제에 대해 책임지지 않습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제3조 (회사의 의무와 면책 조항)</h2>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>회사는 지속적이고 안정적으로 서비스를 제공하기 위해 최선을 다합니다.</li>
                            <li>서비스에 포함된 사육 가이드, 적온/수질 정보, 합사 정보 등은 참고용 정보입니다. 생물의 건강과 생존 여부는 사용자 개인의 사육 환경에 따라 크게 달라질 수 있으며, 회사는 본 정보의 사용으로 인해 발생하는 생물의 폐사, 질병 등의 문제에 대하여 일체의 법적 책임을 지지 않습니다.</li>
                            <li>천재지변, 서버 장애, 통신망 장애 등 불가항력적 사유로 서비스가 중단될 수 있으며, 이로 인한 손해에 대해 회사는 배상 책임을 지지 않습니다.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제4조 (약관의 변경)</h2>
                        <p>회사는 필요한 경우 관련 법령을 위배하지 않는 범위 내에서 본 약관을 변경할 수 있으며, 약관이 변경될 경우 서비스 내 공지사항을 통해 미리 안내합니다.</p>
                    </section>

                    <p className="mt-8 text-xs text-slate-500">부칙: 이 약관은 2026년 3월부터 시행됩니다.</p>
                </div>
            </div>
        </div>
    );
}
