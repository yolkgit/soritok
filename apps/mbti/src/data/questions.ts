import type { Axis, Question } from '../types'

// 6개 축(2^6 = 64유형). 축마다 7문항, 총 42문항.
// 리커트 5점(전혀 아니다=1 ~ 매우 그렇다=5)으로 동의 정도를 측정.
// key='a' 는 동의할수록 poleA, key='b' 는 동의할수록 poleB(역채점).
// 한 축 안에 양방향 문항을 섞어 묵종편향(무조건 '그렇다')을 보정한다.

export const AXES: Axis[] = [
  { id: 'EI', poleA: 'E', poleB: 'I', name: '에너지 방향' },
  { id: 'SN', poleA: 'S', poleB: 'N', name: '인식 기능' },
  { id: 'TF', poleA: 'T', poleB: 'F', name: '판단 기능' },
  { id: 'JP', poleA: 'J', poleB: 'P', name: '생활 양식' },
  { id: 'AT', poleA: 'A', poleB: 'T', name: '자기확신' }, // A=확신형 / T=민감형
  { id: 'BD', poleA: 'B', poleB: 'D', name: '관계 방식' }, // B=광역형 / D=심층형
]

export const QUESTIONS: Question[] = [
  // ── EI (에너지 방향: E 외향 / I 내향) ──
  { axis: 'EI', text: '처음 보는 사람과도 어렵지 않게 대화를 시작하는 편이다.', key: 'a' },
  { axis: 'EI', text: '활기차고 사람 많은 모임에 다녀오면 기운이 난다.', key: 'a' },
  { axis: 'EI', text: '생각은 말로 꺼내면서 정리되는 편이다.', key: 'a' },
  { axis: 'EI', text: '여럿이 함께 있을 때 아이디어가 더 잘 떠오른다.', key: 'a' },
  { axis: 'EI', text: '혼자 보내는 시간이 충분해야 비로소 에너지가 회복된다.', key: 'b' },
  { axis: 'EI', text: '낯선 사람이 많은 자리는 끝나고 나면 진이 빠진다.', key: 'b' },
  { axis: 'EI', text: '중요한 생각은 머릿속에서 충분히 정리한 뒤에 말한다.', key: 'b' },

  // ── SN (인식 기능: S 감각 / N 직관) ──
  { axis: 'SN', text: '막연한 가능성보다 눈앞의 구체적인 사실을 더 신뢰한다.', key: 'a' },
  { axis: 'SN', text: '일은 검증된 방식대로 차근차근 하는 편이 마음 편하다.', key: 'a' },
  { axis: 'SN', text: '설명은 실용적인 예시와 디테일이 있을 때 더 잘 와닿는다.', key: 'a' },
  { axis: 'SN', text: '무언가를 보면 “앞으로 어떻게 연결·전개될까”를 자주 상상한다.', key: 'b' },
  { axis: 'SN', text: '익숙한 방식보다 새로운 시도를 해보는 쪽에 끌린다.', key: 'b' },
  { axis: 'SN', text: '현실의 디테일보다 전체적인 의미나 큰 그림에 더 흥미를 느낀다.', key: 'b' },
  { axis: 'SN', text: '공상이나 상상에 빠져 시간 가는 줄 모를 때가 종종 있다.', key: 'b' },

  // ── TF (판단 기능: T 사고 / F 감정) ──
  { axis: 'TF', text: '결정할 때 감정보다 논리와 사실관계를 먼저 따진다.', key: 'a' },
  { axis: 'TF', text: '두루뭉술한 친절보다 솔직하고 정확한 피드백이 더 도움이 된다고 본다.', key: 'a' },
  { axis: 'TF', text: '갈등 상황에서는 누가 옳은지부터 짚게 된다.', key: 'a' },
  { axis: 'TF', text: '결정을 내릴 때 그 일이 사람들에게 미칠 감정을 먼저 떠올린다.', key: 'b' },
  { axis: 'TF', text: '누군가 힘들어하면 해결책보다 먼저 마음을 살핀다.', key: 'b' },
  { axis: 'TF', text: '맞는 말이라도 상대가 상처받지 않게 전하는 것이 중요하다.', key: 'b' },
  { axis: 'TF', text: '일관된 원칙보다 상황과 사람에 맞춘 배려를 우선하는 편이다.', key: 'b' },

  // ── JP (생활 양식: J 판단/계획 / P 인식/유연) ──
  { axis: 'JP', text: '미리 계획을 세우고 그대로 지킬 때 안정감을 느낀다.', key: 'a' },
  { axis: 'JP', text: '할 일은 마감 한참 전에 끝내 두어야 마음이 편하다.', key: 'a' },
  { axis: 'JP', text: '정리정돈된 환경에서 능률이 더 오른다.', key: 'a' },
  { axis: 'JP', text: '일정을 빡빡하게 정하기보다 상황에 맞춰 움직이는 게 편하다.', key: 'b' },
  { axis: 'JP', text: '마감이 임박해야 오히려 집중력이 살아난다.', key: 'b' },
  { axis: 'JP', text: '선택지를 미리 닫기보다 열어두는 쪽을 선호한다.', key: 'b' },
  { axis: 'JP', text: '계획이 틀어져도 크게 동요하지 않고 즉흥적으로 대응한다.', key: 'b' },

  // ── AT (자기확신: A 확신형 / T 민감형) ──
  { axis: 'AT', text: '실수를 해도 “그럴 수 있지” 하고 비교적 빨리 털어낸다.', key: 'a' },
  { axis: 'AT', text: '내가 내린 선택에 대체로 자신감이 있다.', key: 'a' },
  { axis: 'AT', text: '남이 나를 어떻게 평가하든 크게 흔들리지 않는다.', key: 'a' },
  { axis: 'AT', text: '사소한 실수가 한참 동안 머릿속에 맴돈다.', key: 'b' },
  { axis: 'AT', text: '내 결정이 정말 옳았는지 자주 되짚어 본다.', key: 'b' },
  { axis: 'AT', text: '스트레스를 받으면 평소보다 예민해지는 편이다.', key: 'b' },
  { axis: 'AT', text: '“더 잘할 수 있었는데” 하는 아쉬움을 자주 느낀다.', key: 'b' },

  // ── BD (관계 방식: B 광역형 / D 심층형) ──
  { axis: 'BD', text: '다양한 사람과 두루 알고 지내는 편을 좋아한다.', key: 'a' },
  { axis: 'BD', text: '모임에서는 여러 사람과 골고루 어울리려 한다.', key: 'a' },
  { axis: 'BD', text: '새로운 사람을 만나는 자리에 설렘을 느낀다.', key: 'a' },
  { axis: 'BD', text: '소수의 사람과 깊이 사귀는 쪽을 더 선호한다.', key: 'b' },
  { axis: 'BD', text: '넓은 인맥보다 마음을 터놓는 한두 사람이 더 든든하다.', key: 'b' },
  { axis: 'BD', text: '모임에서도 한두 명과 진솔하게 이야기하는 게 편하다.', key: 'b' },
  { axis: 'BD', text: '익숙한 사람들과 있을 때 가장 편안함을 느낀다.', key: 'b' },
]
