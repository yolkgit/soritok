
import React from 'react';
import { X, User, Calendar, CheckCircle2, Trophy, Printer, Smile, MousePointer2, Settings, Lock, Coins } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden transform transition-all scale-100 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="bg-indigo-600 px-6 py-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-bold text-xl flex items-center gap-2">
              <Smile size={24} className="text-yellow-300" />
              위클리 페이퍼 사용 설명서
            </h3>
            <p className="text-indigo-100 text-sm mt-1">아이와 함께 행복한 습관을 만들어보세요!</p>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">

          {/* Step 1: Child Setup */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
              아이 등록 및 기본 설정
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed text-sm">
              <p>위클리 페이퍼는 아이 스스로 계획을 세우고 실천하는 습관을 기르도록 돕습니다.</p>
              <ul className="list-disc list-inside bg-slate-50 p-3 rounded-lg space-y-1.5 mt-2">
                <li>화면 상단의 <strong className="text-slate-800">아이 이름 버튼</strong>을 누르면 언제든 다른 자녀의 계획표로 전환할 수 있습니다.</li>
                <li>자녀별 정보(이름, 학년, 색상 등)는 상단 <strong className="text-slate-800">설정(톱니바퀴)</strong> 버튼을 눌러 수정 및 추가가 가능합니다.</li>
                <li>학년(초등/중등/고등)을 설정하면 중앙 상단의 버튼을 눌러 각 연령에 맞는 <strong className="text-indigo-600">추천 시간표</strong>를 한 번에 불러올 수 있습니다.</li>
              </ul>
            </div>
          </section>

          {/* Step 2: Planning */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
              시간표 짜기 (계획 수립)
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed text-sm">
              <p>
                <strong className="text-rose-500">주의!</strong> 일정을 추가하거나 지우려면 화면 우측 상단의
                <span className="inline-block bg-slate-800 text-white text-xs px-2 py-0.5 rounded mx-1">부모님 모드</span>가 반드시 켜져 있어야 합니다.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg">
                  <strong className="block text-blue-800 mb-1 flex items-center gap-1"><MousePointer2 size={14} /> 한 칸 클릭 (단일 선택)</strong>
                  원하는 시간의 빈 칸을 클릭하면 해당 시간에만 일정을 세밀하게 입력할 수 있습니다.
                </div>
                <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg">
                  <strong className="block text-blue-800 mb-1 flex items-center gap-1"><MousePointer2 size={14} /> 드래그 (다중 선택)</strong>
                  마우스를 꾹 누른 채로 아래로 끌어내리면 한 번에 2~3시간 연속되는 일정을 묶어서 입력할 수 있습니다.
                </div>
              </div>
            </div>
          </section>

          {/* Step 3: Checking & Variable Rewards */}
          <section className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl shadow-sm">
            <h4 className="text-lg font-bold text-indigo-800 mb-3 flex items-center gap-2">
              <span className="bg-indigo-200 text-indigo-800 w-8 h-8 rounded-full flex items-center justify-center text-sm">3</span>
              실천 검사 및 포인트(게임 시간) 적립 규칙 ★
            </h4>
            <div className="text-slate-700 space-y-3 leading-relaxed text-sm">
              <p>아이가 하루를 마치면, 부모님은 아이와 함께 계획표를 보며 성공/실패 여부를 체크해주세요.</p>

              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <strong className="text-indigo-600 block mb-2">✅ 기본 체크 방법</strong>
                <ol className="list-decimal list-inside space-y-1 text-slate-600">
                  <li>먼저 중앙의 <strong className="text-green-600">🔒 계획 확정하기</strong> 버튼을 눌러 계획표를 잠가주세요.</li>
                  <li>잠긴 계획표에서 <strong className="text-slate-800">일정을 클릭</strong>하면 <strong className="text-green-600">성공(초록색 O)</strong>으로 바뀝니다.</li>
                  <li>한 번 더 클릭하면 <strong className="text-red-500">실패(빨간색 X)</strong> 처리되며, 다시 클릭하면 '대기(회색)' 상태로 돌아갑니다.</li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mt-3">
                <strong className="text-yellow-800 text-base flex items-center gap-2 mb-2">
                  <Trophy size={18} /> 🎯 행동별 변칙 적립 (포인트 차등 지급)
                </strong>
                <p className="text-yellow-700 mb-2">모든 일정이 똑같은 점수를 주지 않습니다. 일정의 '종류(분류)'와 '지속 시간'에 따라 점수가 다르게 곱해져 쌓입니다!</p>

                <ul className="space-y-3 mt-3">
                  <li className="flex gap-2 bg-white p-2 border border-yellow-100 rounded">
                    <span className="w-20 font-bold text-yellow-800 shrink-0">⏰ 시간 비례</span>
                    <span className="text-slate-600">기본적으로 <strong>1시간 단위</strong>로 점수가 지급됩니다. 만약 설정된 보상이 10점이라면, 2시간(120분)짜리 일정을 성공했을 때는 자동으로 곱해져 <strong>20점</strong>이 적립됩니다. (30분짜리 단기 일정은 5점만 적립)</span>
                  </li>
                  <li className="flex gap-2 bg-white p-2 border border-yellow-100 rounded">
                    <span className="w-20 font-bold text-yellow-800 shrink-0">📚 공부/숙제</span>
                    <span className="text-slate-600">'공부' 카테고리는 가장 많은 점수(기본 10점)를 줍니다. 엉덩이를 붙이고 집중해야 하는 고강도 활동이기 때문입니다.</span>
                  </li>
                  <li className="flex gap-2 bg-white p-2 border border-yellow-100 rounded">
                    <span className="w-20 font-bold text-yellow-800 shrink-0">🏫 학교/학원</span>
                    <span className="text-slate-600">당연히 가야 하는 정규 일과이므로, 자발적 공부보다는 보상이 적게 설정되어 있습니다. (기본 30점/5점 등 자유롭게 변경 가능)</span>
                  </li>
                  <li className="flex gap-2 bg-white p-2 border border-yellow-100 rounded">
                    <span className="w-20 font-bold text-yellow-800 shrink-0">🎮 휴식/기타</span>
                    <span className="text-slate-600">단순히 쉬는 시간(휴식, 수면 등)은 계획을 지켰다 하더라도 포인트를 지급하지 않도록 기본 설정되어 있습니다 (0점). 무분별한 보상 남용을 막아줍니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Step 4: Using Rewards */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-indigo-700 mb-3 flex items-center gap-2">
              <span className="bg-indigo-100 text-indigo-700 w-8 h-8 rounded-full flex items-center justify-center text-sm">4</span>
              적립한 포인트(게임 시간) 사용하기
            </h4>
            <div className="text-slate-600 space-y-2 leading-relaxed text-sm">
              <p>열심히 모은 점수를 아이가 사용(게임 플레이, 간식 구매 등)할 때 깎는 방법입니다.</p>
              <div className="flex items-start gap-3 mt-2 bg-slate-50 p-3 rounded-lg">
                <div className="bg-indigo-100 p-2 rounded-lg shrink-0 mt-1">
                  <Coins className="text-indigo-600" size={20} />
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 mb-1">상단 좌측 점수판(알약 모양) 클릭</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>현재까지 누적된 <strong className="text-indigo-600">총 획득 포인트</strong>와 <strong className="text-rose-500">총 사용 포인트</strong>를 쉽게 볼 수 있습니다.</li>
                    <li>아이가 지정된 양식을 소비할 때(예: 게임 30분) 숫자를 입력하고 <strong className="text-slate-800 bg-white border px-1 rounded shadow-sm">포인트 사용(차감)</strong>을 누르세요.</li>
                    <li><strong>부모님 모드 전용:</strong> 실수로 잘못 차감한 내역이 있다면, <strong>최근 사용 기록</strong> 리스트 옆의 🗑️ <strong>빨간색 휴지통 아이콘</strong>을 통하여 개별적으로 내역을 삭제하고 점수를 복구할 수 있습니다.</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Advanced: Configuring Rewards */}
          <section className="bg-slate-100 border border-slate-200 p-5 rounded-xl">
            <h4 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Settings size={20} className="text-slate-500" />
              심화 기능: "스마트 점수 설정" (내 아이만의 룰 만들기)
            </h4>
            <div className="text-slate-600 text-sm space-y-3">
              <p>
                형제간 나이가 다르거나, 이번 주의 핵심 과제가 다를 때 부모님 마음대로 보상 체계를 뜯어고칠 수 있습니다!
              </p>
              <ol className="list-decimal list-inside bg-white p-4 border border-slate-200 shadow-sm rounded-lg space-y-2 font-medium">
                <li>화면 오른쪽 위 <strong>부모님 모드</strong>를 켭니다. (비밀번호 0000 또는 설정하신 핀 번호)</li>
                <li>화면 왼쪽 위 <strong>점수판 위젯</strong>을 클릭해 모달 창을 엽니다.</li>
                <li>모달창 우측 상단의 ⚙️ <strong>설정 아이콘</strong>을 누르세요.</li>
                <li>여기서 보상의 <strong className="text-indigo-600">이름(포인트 vs 게임 시간 단위)</strong>을 바꿀 수 있습니다.</li>
                <li><strong>각 활동마다 시간당 점수를 설정하세요!</strong><br />
                  <span className="text-slate-400 font-normal pl-4 text-xs block mt-1">예: 학교는 5점, 독서는 30점, 운동은 50점 등 자유롭게 가중치를 두어 아이가 특정 행동을 더 선호하도록 '행동 교정 설계'를 할 수 있습니다.</span>
                </li>
              </ol>
            </div>
          </section>

          {/* Tips */}
          <section className="bg-teal-50 border border-teal-100 p-5 rounded-xl">
            <h4 className="font-bold text-teal-800 mb-2 flex items-center gap-2">
              💡 놓치지 말아야 할 편리한 기능
            </h4>
            <ul className="space-y-2 text-sm text-teal-700">
              <li className="flex items-start gap-2">
                <Printer size={16} className="shrink-0 mt-0.5" />
                <span>상단의 <strong>프린터 아이콘</strong>을 눌러보세요. 웹 컬러를 제외하고 눈에 잘 띄는 흑백 모드로 자동 전환되어 인쇄됩니다. 아이 책상 앞이나 냉장고에 자석으로 붙여두면 효과 만점입니다!</span>
              </li>
              <li className="flex items-start gap-2">
                <User size={16} className="shrink-0 mt-0.5" />
                <span>저장 버튼이 따로 없어도 당황하지 마세요. 로그인을 한 상태에서는 작성하는 <strong>모든 일정이 서버에 실시간으로 실크로드처럼 자동 저장</strong>됩니다. 컴퓨터를 끄고 핸드폰으로 접속해도 100% 동일하게 연동됩니다.</span>
              </li>
            </ul>
          </section>

        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition-transform active:scale-95"
          >
            네, 이제 시작해볼게요! 화이팅!
          </button>
        </div>
      </div>
    </div>
  );
};
