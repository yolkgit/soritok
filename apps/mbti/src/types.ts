// 6축 식별자
export type AxisId = 'EI' | 'SN' | 'TF' | 'JP' | 'AT' | 'BD'

export interface Axis {
  id: AxisId
  poleA: string
  poleB: string
  name: string
}

export interface Choice {
  text: string
  pole: string
}

export interface Question {
  axis: AxisId
  a: Choice
  b: Choice
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
}
