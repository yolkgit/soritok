export type ServiceStatus = 'active' | 'coming-soon'

/**
 * 서비스를 책상 위에서 어떤 "사물"로 표현할지 정합니다.
 *  - board    : 벽 보드판에 핀으로 붙인 종이 (예: 위클리 페이퍼)
 *  - goban    : 책상에 올려둔 바둑판 (예: 어린이 바둑교실)
 *  - aquarium : 책상 위 어항 (예: 관상어 도감)
 *  - arcade   : 휴대용 게임기 (예: 미니 게임)
 *  - book     : 책장에 꽂히는 책 한 권 (예: 과목별 교육) — 여러 권이 책장에 모임
 *  - note     : 책상 위 포스트잇 (준비중/가벼운 서비스의 기본 표현)
 * 새 종류가 필요하면 여기에 추가하고 components 에 대응 컴포넌트를 만들면 됩니다.
 */
export type ServiceKind =
  | 'board'
  | 'goban'
  | 'aquarium'
  | 'arcade'
  | 'book'
  | 'note'

export interface Service {
  /** 고유 id (영문 소문자) — 라우팅/추적용 */
  id: string
  /** 사물 표현 방식 */
  kind: ServiceKind
  /** 제목 */
  title: string
  /** 한 줄 설명 */
  subtitle: string
  /** 모달에서 보여줄 자세한 소개 */
  description: string
  /** 서비스 주소 */
  url: string
  /** 강조색 (라벨/모달 포인트) */
  color: string
  /** 모달 상단 아이콘 이모지 */
  emoji: string
  /** active: 바로 이용 / coming-soon: 준비중(클릭 비활성) */
  status: ServiceStatus
}
