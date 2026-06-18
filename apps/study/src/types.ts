export type Level = 'elem' | 'mid' | 'high'

export interface StudyNote {
  id: string
  level: Level
  grade: number
  semester: number
  subject: string
  unit: string
  title?: string
  /** 수기 마크업: ==형광==, **빨강**, __파랑__, # 제목, - 항목 */
  content: string
  source?: string
  updatedAt?: string
}

export const LEVELS: { id: Level; label: string; grades: number[] }[] = [
  { id: 'elem', label: '초등학교', grades: [1, 2, 3, 4, 5, 6] },
  { id: 'mid', label: '중학교', grades: [1, 2, 3] },
  { id: 'high', label: '고등학교', grades: [1, 2, 3] },
]

export const SUBJECTS: { id: string; label: string }[] = [
  { id: 'korean', label: '국어' },
  { id: 'math', label: '수학' },
  { id: 'english', label: '영어' },
  { id: 'science', label: '과학' },
  { id: 'social', label: '사회' },
]

export const levelLabel = (l: Level) => LEVELS.find((x) => x.id === l)?.label ?? l
export const subjectLabel = (s: string) => SUBJECTS.find((x) => x.id === s)?.label ?? s
