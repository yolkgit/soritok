// 6축 식별자
export type AxisId = 'EI' | 'SN' | 'TF' | 'JP' | 'AT' | 'BD'

export interface Axis {
  id: AxisId
  poleA: string
  poleB: string
  name: string
}

export interface Question {
  axis: AxisId
  /** 문항(진술문). 리커트 5점으로 동의 정도를 응답 */
  text: string
  /** 'a' = 동의할수록 poleA / 'b' = 동의할수록 poleB (역채점) */
  key: 'a' | 'b'
}

// 6글자 결과 글자 모음 (예: { EI:'E', SN:'N', ... })
export type Letters = Record<AxisId, string>

export interface BaseType {
  name: string
  emoji: string
  tagline: string
  desc: string
  strengths: string[]
  weaknesses: string[]
  /** 연애·관계에서의 모습 */
  love: string
  /** 일·공부에서의 모습 */
  work: string
  /** 잘 맞는 유형 + 이유 */
  match: string
}

export interface Trait {
  label: string
  code: string
  emoji: string
  line: string
  desc: string
  watch: string
}

/** 축별 선호도 분석 (전문 측정 표현) */
export interface AxisScore {
  id: AxisId
  name: string
  leftPole: string
  leftLabel: string
  rightPole: string
  rightLabel: string
  leftPct: number
  rightPct: number
  pick: string
  clarity: '뚜렷함' | '보통' | '약함'
}

/** 융 인지기능 1개 */
export interface CogFn {
  pos: '주기능' | '부기능' | '3차기능' | '열등기능'
  code: string
  name: string
  desc: string
}

export interface ResultData {
  code: string
  baseKey: string
  base: BaseType
  at: Trait
  bd: Trait
  growth: string
  fullName: string
  /** 6축 선호도 분석 */
  axes: AxisScore[]
  /** 융 인지기능 스택(주→열등) */
  functions: CogFn[]
  /** 스트레스(열등기능 그립) 반응 */
  stress: string
  /** 추천 직무·분야 */
  careers: string[]
  /** 발달 과제(성장 제언) */
  growthTasks: string[]
  /** 이 유형과 잘 지내는 법(소통 가이드) */
  relationGuide: string
  /** 자기확신(AT)×관계방식(BD) 조합 심층 */
  combo: { label: string; desc: string }
}
