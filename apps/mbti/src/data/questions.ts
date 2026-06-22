import type { Axis, Question } from '../types'

// 6개 축(2^6 = 64유형). 각 축마다 5문항, 총 30문항.
// 각 문항은 두 선택지(a/b)가 각각 한 극(pole)에 1점을 준다.
// 축이 서로 독립이므로 글자 충돌(T=Thinking vs T=Turbulent)은 점수 집계에서 발생하지 않는다.

export const AXES: Axis[] = [
  { id: 'EI', poleA: 'E', poleB: 'I', name: '에너지 방향' },
  { id: 'SN', poleA: 'S', poleB: 'N', name: '인식 기능' },
  { id: 'TF', poleA: 'T', poleB: 'F', name: '판단 기능' },
  { id: 'JP', poleA: 'J', poleB: 'P', name: '생활 양식' },
  { id: 'AT', poleA: 'A', poleB: 'T', name: '자기확신' }, // A=확신형 / T=민감형(Turbulent)
  { id: 'BD', poleA: 'B', poleB: 'D', name: '관계 방식' }, // B=광역형 / D=심층형
]

export const QUESTIONS: Question[] = [
  // ── EI (에너지 방향) ──
  {
    axis: 'EI',
    a: { text: '사람들과 어울리고 나면 에너지가 충전된다', pole: 'E' },
    b: { text: '혼자만의 시간을 보내야 에너지가 충전된다', pole: 'I' },
  },
  {
    axis: 'EI',
    a: { text: '처음 본 사람에게도 먼저 말을 잘 건다', pole: 'E' },
    b: { text: '상대가 먼저 다가와 주는 편이 편하다', pole: 'I' },
  },
  {
    axis: 'EI',
    a: { text: '생각은 말로 꺼내면서 정리되는 편이다', pole: 'E' },
    b: { text: '머릿속에서 충분히 정리한 뒤 말하는 편이다', pole: 'I' },
  },
  {
    axis: 'EI',
    a: { text: '주말엔 약속이 꽉 차 있어야 즐겁다', pole: 'E' },
    b: { text: '주말엔 조용히 쉬는 계획이 더 끌린다', pole: 'I' },
  },
  {
    axis: 'EI',
    a: { text: '활기찬 분위기 속에 있을 때 신이 난다', pole: 'E' },
    b: { text: '차분한 환경에서 더 집중이 잘 된다', pole: 'I' },
  },

  // ── SN (인식 기능) ──
  {
    axis: 'SN',
    a: { text: '눈앞의 사실과 구체적인 정보를 신뢰한다', pole: 'S' },
    b: { text: '그 너머의 가능성과 의미가 더 궁금하다', pole: 'N' },
  },
  {
    axis: 'SN',
    a: { text: '검증된 방법대로 차근차근 하는 게 좋다', pole: 'S' },
    b: { text: '새로운 방식을 시도해 보는 게 즐겁다', pole: 'N' },
  },
  {
    axis: 'SN',
    a: { text: '"지금 무엇을" 이 더 중요하다', pole: 'S' },
    b: { text: '"앞으로 어떻게 될까" 가 더 흥미롭다', pole: 'N' },
  },
  {
    axis: 'SN',
    a: { text: '설명은 디테일하고 실용적일수록 좋다', pole: 'S' },
    b: { text: '설명은 비유와 큰 그림이 있을 때 와닿는다', pole: 'N' },
  },
  {
    axis: 'SN',
    a: { text: '현실적으로 가능한 일에 집중한다', pole: 'S' },
    b: { text: '상상력을 발휘하는 일에 자주 빠진다', pole: 'N' },
  },

  // ── TF (판단 기능) ──
  {
    axis: 'TF',
    a: { text: '결정할 때 논리와 사실이 우선이다', pole: 'T' },
    b: { text: '결정할 때 사람의 감정을 먼저 고려한다', pole: 'F' },
  },
  {
    axis: 'TF',
    a: { text: '솔직한 피드백이 친절보다 도움이 된다', pole: 'T' },
    b: { text: '맞는 말이라도 따뜻하게 전하는 게 중요하다', pole: 'F' },
  },
  {
    axis: 'TF',
    a: { text: '갈등에선 옳고 그름을 따지게 된다', pole: 'T' },
    b: { text: '갈등에선 분위기와 관계가 먼저 신경 쓰인다', pole: 'F' },
  },
  {
    axis: 'TF',
    a: { text: '"그게 맞아?" 라는 질문을 자주 한다', pole: 'T' },
    b: { text: '"다들 괜찮아?" 라는 질문을 자주 한다', pole: 'F' },
  },
  {
    axis: 'TF',
    a: { text: '객관적이고 일관된 기준을 중시한다', pole: 'T' },
    b: { text: '상황과 사람에 따른 배려를 중시한다', pole: 'F' },
  },

  // ── JP (생활 양식) ──
  {
    axis: 'JP',
    a: { text: '계획을 세우고 그대로 지킬 때 안정감을 느낀다', pole: 'J' },
    b: { text: '상황에 맞춰 즉흥적으로 움직일 때 자유롭다', pole: 'P' },
  },
  {
    axis: 'JP',
    a: { text: '할 일은 미리 끝내 둬야 마음이 편하다', pole: 'J' },
    b: { text: '마감이 닥쳐야 집중력이 살아난다', pole: 'P' },
  },
  {
    axis: 'JP',
    a: { text: '정리정돈된 환경에서 능률이 오른다', pole: 'J' },
    b: { text: '조금 어수선해도 크게 불편하지 않다', pole: 'P' },
  },
  {
    axis: 'JP',
    a: { text: '여행은 일정표가 있어야 든든하다', pole: 'J' },
    b: { text: '여행은 발길 닿는 대로가 더 재밌다', pole: 'P' },
  },
  {
    axis: 'JP',
    a: { text: '결정을 빨리 내려 끝맺는 걸 선호한다', pole: 'J' },
    b: { text: '선택지를 열어두고 유연하게 두는 걸 선호한다', pole: 'P' },
  },

  // ── AT (자기확신: A=확신형 / T=민감형) ──
  {
    axis: 'AT',
    a: { text: '실수해도 "그럴 수 있지" 하고 금방 넘긴다', pole: 'A' },
    b: { text: '실수가 한참 동안 머릿속에 맴돈다', pole: 'T' },
  },
  {
    axis: 'AT',
    a: { text: '내 선택에 대체로 자신감이 있다', pole: 'A' },
    b: { text: '내 선택이 맞았는지 자주 되짚어 본다', pole: 'T' },
  },
  {
    axis: 'AT',
    a: { text: '남의 평가에 크게 흔들리지 않는다', pole: 'A' },
    b: { text: '남이 나를 어떻게 볼지 신경이 쓰인다', pole: 'T' },
  },
  {
    axis: 'AT',
    a: { text: '스트레스 상황에서도 비교적 침착하다', pole: 'A' },
    b: { text: '스트레스를 받으면 예민해지는 편이다', pole: 'T' },
  },
  {
    axis: 'AT',
    a: { text: '"이 정도면 충분해" 라고 자주 느낀다', pole: 'A' },
    b: { text: '"더 잘할 수 있었는데" 라고 자주 느낀다', pole: 'T' },
  },

  // ── BD (관계 방식: B=광역형 / D=심층형) ──
  {
    axis: 'BD',
    a: { text: '다양한 사람과 두루 알고 지내는 게 좋다', pole: 'B' },
    b: { text: '소수의 사람과 깊이 사귀는 게 좋다', pole: 'D' },
  },
  {
    axis: 'BD',
    a: { text: '모임에선 여러 사람과 골고루 대화한다', pole: 'B' },
    b: { text: '모임에선 한두 명과 진솔하게 대화한다', pole: 'D' },
  },
  {
    axis: 'BD',
    a: { text: '인맥은 넓을수록 기회가 많다고 본다', pole: 'B' },
    b: { text: '관계는 깊을수록 든든하다고 본다', pole: 'D' },
  },
  {
    axis: 'BD',
    a: { text: '새 사람을 만나는 자리가 설렌다', pole: 'B' },
    b: { text: '익숙한 사람과 있는 자리가 편하다', pole: 'D' },
  },
  {
    axis: 'BD',
    a: { text: '연락처에 아는 사람이 많은 편이다', pole: 'B' },
    b: { text: '연락처는 적지만 진한 사이가 많다', pole: 'D' },
  },
]
