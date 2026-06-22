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

export interface ResultData {
  code: string
  baseKey: string
  base: BaseType
  at: Trait
  bd: Trait
  growth: string
  fullName: string
}
