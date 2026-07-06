import { useEffect, useMemo, useRef, useState } from 'react'
import { useAds, adsVisible, AdInterstitial } from '@soritok/ads'
import { LEVELS, SUBJECTS, levelLabel, subjectLabel } from './types'
import type { Level, StudyNote } from './types'
import { BUILTIN_NOTES } from './data/notes'
import { fetchNotes } from './lib/api'
import HandwrittenNote from './components/HandwrittenNote'
import AdminPanel from './components/AdminPanel'

const card: React.CSSProperties = {
  border: 'none',
  cursor: 'pointer',
  borderRadius: 16,
  padding: '22px 18px',
  background: 'rgba(255,255,255,0.85)',
  color: '#2b3a2b',
  fontWeight: 700,
  fontSize: 18,
  boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
}

const badgeSoon: React.CSSProperties = {
  display: 'inline-block',
  marginLeft: 8,
  fontSize: 12,
  fontWeight: 700,
  color: '#9a8',
  verticalAlign: 'middle',
}

function Badge({ n }: { n: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        marginLeft: 8,
        fontSize: 13,
        fontWeight: 800,
        color: '#2f7d47',
        background: 'rgba(47,125,71,0.12)',
        borderRadius: 999,
        padding: '2px 9px',
        verticalAlign: 'middle',
      }}
    >
      {n}
    </span>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 14,
        marginTop: 24,
      }}
    >
      {children}
    </div>
  )
}

export default function App() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const initialSubject = params.get('subject') || undefined
  const isAdmin = params.get('admin') === '1'
  const [level, setLevel] = useState<Level | null>(null)
  const [grade, setGrade] = useState<number | null>(null)
  const [semester, setSemester] = useState<number | null>(null)
  const [subject, setSubject] = useState<string | null>(null)

  // 인쇄 전 광고 게이트
  const { config, isPremium } = useAds()
  const [printAdOpen, setPrintAdOpen] = useState(false)
  const startPrint = () => {
    if (adsVisible(config, isPremium)) setPrintAdOpen(true)
    else window.print()
  }

  const ready = level && grade && semester && subject
  const [apiNotes, setApiNotes] = useState<StudyNote[] | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [live, setLive] = useState(false)
  const pollRef = useRef<number | null>(null)

  // 단원 보기에서 20초마다 자동 수집/갱신
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const load = async () => {
      const res = await fetchNotes({ level: level!, grade: grade!, semester: semester!, subject: subject! })
      if (cancelled) return
      setLive(res !== null)
      if (res) {
        setApiNotes(res)
        setLastSync(new Date())
      }
    }
    load()
    pollRef.current = window.setInterval(load, 20000)
    return () => {
      cancelled = true
      if (pollRef.current) window.clearInterval(pollRef.current)
    }
  }, [ready, level, grade, semester, subject])

  // 표시할 노트: 내장 정리 + 백엔드 정리 병합(같은 단원은 서버가 우선)
  const notes = useMemo(() => {
    if (!ready) return []
    const builtinFiltered = BUILTIN_NOTES.filter(
      (n) => n.level === level && n.grade === grade && n.semester === semester && n.subject === subject,
    )
    if (!apiNotes || apiNotes.length === 0) return builtinFiltered
    const byUnit = new Map<string, StudyNote>()
    for (const n of builtinFiltered) byUnit.set(n.unit, n)
    for (const n of apiNotes) byUnit.set(n.unit, n) // 서버 노트가 덮어씀
    return [...byUnit.values()]
  }, [ready, apiNotes, level, grade, semester, subject])

  // 과목/학년별 내장 단원 수 (뱃지용)
  const countFor = (q: { level?: Level; grade?: number; semester?: number; subject?: string }) =>
    BUILTIN_NOTES.filter(
      (n) =>
        (q.level === undefined || n.level === q.level) &&
        (q.grade === undefined || n.grade === q.grade) &&
        (q.semester === undefined || n.semester === q.semester) &&
        (q.subject === undefined || n.subject === q.subject),
    ).length

  const reset = (to: 'level' | 'grade' | 'semester' | 'subject') => {
    if (to === 'level') {
      setLevel(null)
      setGrade(null)
      setSemester(null)
      setSubject(null)
    } else if (to === 'grade') {
      setGrade(null)
      setSemester(null)
      setSubject(null)
    } else if (to === 'semester') {
      setSemester(null)
      setSubject(null)
    } else {
      setSubject(null)
    }
    setApiNotes(null)
  }

  const crumb = (label: string, onClick?: () => void) => (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        border: 'none',
        background: 'transparent',
        color: onClick ? '#2f7d47' : '#2b3a2b',
        fontWeight: 700,
        cursor: onClick ? 'pointer' : 'default',
        fontSize: 15,
        padding: 0,
      }}
    >
      {label}
    </button>
  )

  if (isAdmin) return <AdminPanel />

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '56px 18px 90px' }}>
      <h1 style={{ fontSize: 'clamp(28px,6vw,44px)', fontWeight: 900, margin: 0, textAlign: 'center' }}>
        📚 교육 책장 · 시험정리
      </h1>
      <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 8 }}>
        학년·학기·단원별 핵심을 손글씨 노트로. 새 정리는 자동으로 채워집니다.
      </p>

      {/* breadcrumb */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginTop: 28 }}>
        {crumb('전체', level ? () => reset('level') : undefined)}
        {level && <span>›</span>}
        {level && crumb(levelLabel(level), grade ? () => reset('grade') : undefined)}
        {grade && <span>›</span>}
        {grade && crumb(`${grade}학년`, semester ? () => reset('semester') : undefined)}
        {semester && <span>›</span>}
        {semester && crumb(`${semester}학기`, subject ? () => reset('subject') : undefined)}
        {subject && <span>›</span>}
        {subject && crumb(subjectLabel(subject))}
      </div>

      {/* step 1: level */}
      {!level && (
        <Grid>
          {LEVELS.map((l) => (
            <button key={l.id} style={card} onClick={() => setLevel(l.id)}>
              {l.id === 'elem' ? '🏫' : l.id === 'mid' ? '🎒' : '🎓'} {l.label}
            </button>
          ))}
        </Grid>
      )}

      {/* step 2: grade */}
      {level && !grade && (
        <Grid>
          {LEVELS.find((l) => l.id === level)!.grades.map((g) => {
            const c = countFor({ level, grade: g })
            return (
              <button key={g} style={card} onClick={() => setGrade(g)}>
                {g}학년
                {c > 0 && <Badge n={c} />}
              </button>
            )
          })}
        </Grid>
      )}

      {/* step 3: semester */}
      {level && grade && !semester && (
        <Grid>
          {[1, 2].map((s) => (
            <button key={s} style={card} onClick={() => setSemester(s)}>
              {s}학기
            </button>
          ))}
        </Grid>
      )}

      {/* step 4: subject */}
      {level && grade && semester && !subject && (
        <Grid>
          {SUBJECTS.map((s) => {
            const c = countFor({ level, grade, semester, subject: s.id })
            return (
              <button
                key={s.id}
                style={{
                  ...card,
                  outline: initialSubject === s.id ? '3px solid #2f7d47' : 'none',
                  opacity: c === 0 ? 0.55 : 1,
                }}
                onClick={() => setSubject(s.id)}
              >
                {s.label}
                {c > 0 ? <Badge n={c} /> : <span style={badgeSoon}>준비중</span>}
              </button>
            )
          })}
        </Grid>
      )}

      {/* step 5: notes */}
      {ready && (
        <section className="print-area" style={{ marginTop: 24 }}>
          {/* 인쇄에만 나오는 머리글 */}
          <div className="print-only print-head">
            소리톡 교육 책장 · {levelLabel(level!)} {grade}학년 {semester}학기 {subjectLabel(subject!)} 시험정리
            <span className="print-head-site">soritok.com/study</span>
          </div>
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: live ? '#2f7d47' : '#9a8',
                background: 'rgba(255,255,255,0.7)',
                padding: '4px 12px',
                borderRadius: 999,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: live ? '#2f7d47' : '#c9b',
                  boxShadow: live ? '0 0 0 4px rgba(47,125,71,0.2)' : 'none',
                }}
              />
              {live ? '실시간 수집 중' : '기본 시험정리 제공 중'}
            </span>
            {lastSync && (
              <span style={{ fontSize: 12, opacity: 0.6 }}>
                마지막 갱신 {lastSync.toLocaleTimeString('ko-KR')}
              </span>
            )}
            {notes.length > 0 && (
              <button
                onClick={startPrint}
                style={{
                  marginLeft: 'auto',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#fff',
                  background: '#2f7d47',
                  boxShadow: '0 4px 10px rgba(47,125,71,0.3)',
                }}
              >
                🖨️ A4로 인쇄
              </button>
            )}
          </div>

          {notes.length === 0 ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.7)',
                borderRadius: 14,
                padding: 28,
                textAlign: 'center',
                color: '#5a6b5a',
              }}
            >
              이 과목은 아직 준비 중이에요. <br />
              다른 학기·과목에는 시험정리가 준비되어 있어요 ✍️
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
              {notes
                .slice()
                .sort((a, b) => a.unit.localeCompare(b.unit, 'ko'))
                .map((n) => (
                  <HandwrittenNote key={n.id} note={n} />
                ))}
            </div>
          )}
        </section>
      )}

      {/* 인쇄 전 전면 광고: 카운트다운 후 닫으면 인쇄 시작 */}
      <AdInterstitial
        isOpen={printAdOpen}
        onClose={() => {
          setPrintAdOpen(false)
          window.setTimeout(() => window.print(), 200)
        }}
      />
    </main>
  )
}
