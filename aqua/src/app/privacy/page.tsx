export default function PrivacyPage() {
    return (
        <div className="container mx-auto px-4 py-12 max-w-4xl">
            <div className="prose prose-invert prose-indigo mx-auto bg-slate-800/50 p-6 md:p-12 rounded-2xl shadow-xl border border-slate-700/50 text-slate-300">
                <h1 className="text-3xl font-bold text-white mb-8 border-b border-slate-700 pb-4">개인정보처리방침</h1>

                <div className="space-y-8 text-sm leading-relaxed">
                    <p>
                        Aquado(이하 "회사")는 이용자의 개인정보를 중요시하며, 정보통신망 이용촉진 및 정보보호 등에 관한 법률 및 개인정보 보호법 등을 준수하고 있습니다.
                    </p>

                    <section className="bg-slate-800 p-6 rounded-xl border-l-4 border-amber-500 shadow-md">
                        <h2 className="text-xl font-bold text-white mb-3">Google AdSense 광고 및 쿠키 안내 (중요)</h2>
                        <p className="mb-2"><strong>본 웹사이트는 구글 애드센스(Google AdSense) 광고를 게재할 수 있습니다.</strong></p>
                        <ul className="list-disc pl-5 space-y-2 mt-4 text-slate-300">
                            <li>구글(Google)을 포함한 타사 공급업체는 <strong>쿠키(Cookie)</strong>를 사용하여 사용자가 본 웹사이트 또는 다른 웹사이트를 방문한 기록을 기반으로 맞춤 광고를 게재합니다.</li>
                            <li>구글의 광고 쿠키 사용을 통해 구글과 파트너는 사용자의 사이트 및 인터넷의 다른 사이트 방문을 기반으로 사용자에게 광고를 제공할 수 있습니다.</li>
                            <li>사용자는 <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">구글 광고 설정</a> 페이지를 방문하여 맞춤 광고를 선택 해제할 수 있습니다. (또는 <a href="https://www.aboutads.info" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">aboutads.info</a>를 방문하여 타사 공급업체의 맞춤 광고 쿠키 사용을 선택 해제할 수도 있습니다.)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제1조 (수집하는 개인정보의 항목 및 수집 방법)</h2>
                        <p>본 서비스는 현재 별도의 회원가입을 요구하지 않으며, 사용자를 특정할 수 있는 이름, 전화번호 등의 민감한 개인정보를 직접적으로 수집하지 않습니다. 단, 서비스 이용 과정에서 접속 IP 정보, 쿠키, 방문 일시, 브라우저 정보 등의 서비스 이용 기록이 자동으로 생성되어 수집될 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제2조 (목적 외 사용 및 제3자 제공)</h2>
                        <p>회사는 위에서 명시된 범위를 초과하여 개인정보를 이용하거나 제3자에게 제공하지 않습니다. 다만, 사용자에게 더 나은 광고를 제공하기 위해 Google과 같은 외부 광고 플랫폼에 쿠키 기반 행동 정보가 제공될 수 있습니다.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">제3조 (개인정보의 파기절차 및 방법)</h2>
                        <p>회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</p>
                    </section>

                    <p className="mt-8 text-xs text-slate-500">시행일자: 2026년 3월</p>
                </div>
            </div>
        </div>
    );
}
