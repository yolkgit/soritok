import type { StudyNote } from '../../types'
import { ELEM_NOTES } from './elem'
import { MID_NOTES } from './mid'
import { HIGH_NOTES } from './high'

/**
 * 내장(빌드 포함) 시험정리 전체.
 * 서버/DB 없이도 앱이 풍부한 콘텐츠로 동작하며,
 * 백엔드에 같은 (level·grade·semester·subject·unit) 노트가 올라오면 그쪽이 우선한다.
 */
export const BUILTIN_NOTES: StudyNote[] = [...ELEM_NOTES, ...MID_NOTES, ...HIGH_NOTES]
