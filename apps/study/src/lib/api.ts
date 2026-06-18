import { apiBase } from '@soritok/auth'
import type { Level, StudyNote } from '../types'

export interface NoteQuery {
  level?: Level
  grade?: number
  semester?: number
  subject?: string
}

/**
 * 조건에 맞는 시험정리 노트를 백엔드에서 조회.
 * 백엔드가 없거나 실패하면 null 을 반환(→ 호출부에서 샘플 폴백).
 */
export async function fetchNotes(q: NoteQuery): Promise<StudyNote[] | null> {
  const params = new URLSearchParams()
  if (q.level) params.set('level', q.level)
  if (q.grade) params.set('grade', String(q.grade))
  if (q.semester) params.set('semester', String(q.semester))
  if (q.subject) params.set('subject', q.subject)
  try {
    const res = await fetch(`${apiBase()}/study/notes?${params.toString()}`)
    if (!res.ok) return null
    return (await res.json()) as StudyNote[]
  } catch {
    return null
  }
}
