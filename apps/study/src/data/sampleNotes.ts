import type { StudyNote } from '../types'

/**
 * 백엔드가 비었거나 오프라인일 때 보여줄 샘플 시험정리.
 * 실데이터는 Threads 수집/관리자 ingest 로 채워집니다.
 * 마크업: ==형광== / **빨강** / __파랑__ / # 제목 / - 항목
 */
export const SAMPLE_NOTES: StudyNote[] = [
  {
    id: 's-elem6-math-1-3',
    level: 'elem',
    grade: 6,
    semester: 1,
    subject: 'math',
    unit: '3단원. 분수의 나눗셈',
    title: '분수의 나눗셈 핵심',
    content: `# 분수 ÷ 분수
- 나누는 분수의 ==역수==를 곱한다
- (분수) ÷ (분수) = (분수) × **분모와 분자를 바꾼 수**

# 자주 틀리는 점
- __대분수__는 먼저 가분수로 고치기!
- 계산 후 ==기약분수==로 약분하기

예) 3/4 ÷ 2/5 = 3/4 × **5/2** = 15/8 = __1과 7/8__`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 's-mid2-sci-1-2',
    level: 'mid',
    grade: 2,
    semester: 1,
    subject: 'science',
    unit: '2단원. 물질의 구성',
    title: '원소와 원자',
    content: `# 원소 vs 원자
- ==원소==: 더 이상 분해되지 않는 순수한 물질 (종류)
- ==원자==: 물질을 이루는 가장 작은 입자 (알갱이)

# 원자의 구조
- 중심에 **원자핵**(양성자+중성자), 주위에 __전자__
- 양성자 수 = 전자 수 → 전기적으로 **중성**

# 시험 포인트
- 불꽃 반응 색: 나트륨 __노란색__, 칼륨 ==보라색==`,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 's-high1-kor-2-1',
    level: 'high',
    grade: 1,
    semester: 2,
    subject: 'korean',
    unit: '1단원. 현대시',
    title: '시의 표현 방법',
    content: `# 비유와 상징
- ==직유==: '~같이, ~처럼' 으로 빗댐
- ==은유==: 'A는 B다' 로 빗댐
- **상징**: 추상적 관념을 구체적 사물로

# 운율
- __외형률__: 일정한 규칙 (음수율·음보율)
- __내재율__: 자유시의 은근한 리듬

# 출제 단골
- 화자의 **정서·태도** 파악
- ==감정 이입== vs 객관적 상관물 구분`,
    updatedAt: new Date().toISOString(),
  },
]
