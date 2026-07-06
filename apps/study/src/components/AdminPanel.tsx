import { useMemo, useState } from 'react'
import { apiBase } from '@soritok/auth'
import { LEVELS, SUBJECTS, levelLabel, subjectLabel } from '../types'
import type { Level, StudyNote } from '../types'
import HandwrittenNote from './HandwrittenNote'

const fieldCol: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 }
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#41603f' }
const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #c3d4c1',
  fontSize: 15,
  background: '#fff',
  color: '#2b3a2b',
  fontFamily: 'inherit',
}

const PLACEHOLDER = `# 핵심 개념
- ==형광펜 강조==는 = 두 개로 감싸요
- **빨간 볼펜**은 별표 두 개
- __파란 볼펜__은 밑줄 두 개

# 시험 포인트
- 목록은 - 로 시작해요`

/**
 * 관리자 전용 시험정리 작성 화면 (?admin=1 로 진입).
 * ADMIN_PASSWORD 로 /api/study/ingest 에 upsert — 같은 단원이면 내장 정리를 덮어씀.
 */
export default function AdminPanel() {
  const [level, setLevel] = useState<Level>('elem')
  const [grade, setGrade] = useState(1)
  const [semester, setSemester] = useState(1)
  const [subject, setSubject] = useState('korean')
  const [unit, setUnit] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const grades = LEVELS.find((l) => l.id === level)!.grades

  const preview: StudyNote = useMemo(
    () => ({
      id: 'preview',
      level,
      grade,
      semester,
      subject,
      unit: unit || '단원명 미리보기',
      title: title || undefined,
      content: content || PLACEHOLDER,
    }),
    [level, grade, semester, subject, unit, title, content],
  )

  async function submit() {
    if (!unit.trim() || !content.trim() || !password) {
      setMsg({ ok: false, text: '단원명 · 내용 · 관리자 비밀번호는 필수입니다.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch(`${apiBase()}/study/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          level,
          grade,
          semester,
          subject,
          unit: unit.trim(),
          title: title.trim() || undefined,
          content,
        }),
      })
      const data = await res.json().catch(() => ({}) as { error?: string })
      if (res.ok) {
        setMsg({ ok: true, text: `등록 완료! ${levelLabel(level)} ${grade}학년 ${semester}학기 ${subjectLabel(subject)} — 20초 안에 자동 반영됩니다.` })
      } else {
        setMsg({ ok: false, text: `등록 실패: ${data.error || `HTTP ${res.status}`}` })
      }
    } catch {
      setMsg({ ok: false, text: '서버에 연결할 수 없습니다. (백엔드 미기동?)' })
    }
    setBusy(false)
  }

  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: '56px 18px 90px' }}>
      <h1 style={{ fontSize: 'clamp(26px,5vw,38px)', fontWeight: 900, margin: 0, textAlign: 'center' }}>
        ✍️ 시험정리 작성 <span style={{ fontSize: 16, color: '#2f7d47' }}>관리자</span>
      </h1>
      <p style={{ textAlign: 'center', opacity: 0.7, marginTop: 8, fontSize: 14 }}>
        같은 단원명이 이미 있으면 새 내용으로 덮어써요. <a href="./" style={{ color: '#2f7d47' }}>← 책장으로</a>
      </p>

      <section
        style={{
          background: 'rgba(255,255,255,0.85)',
          borderRadius: 16,
          padding: 20,
          marginTop: 24,
          boxShadow: '0 8px 18px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <div style={fieldCol}>
            <label style={labelStyle}>학교급</label>
            <select
              style={inputStyle}
              value={level}
              onChange={(e) => {
                setLevel(e.target.value as Level)
                setGrade(1)
              }}
            >
              {LEVELS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldCol}>
            <label style={labelStyle}>학년</label>
            <select style={inputStyle} value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}학년
                </option>
              ))}
            </select>
          </div>
          <div style={fieldCol}>
            <label style={labelStyle}>학기</label>
            <select style={inputStyle} value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
              <option value={1}>1학기</option>
              <option value={2}>2학기</option>
            </select>
          </div>
          <div style={fieldCol}>
            <label style={labelStyle}>과목</label>
            <select style={inputStyle} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={fieldCol}>
          <label style={labelStyle}>단원명 *</label>
          <input
            style={inputStyle}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="예) 3단원. 분수의 나눗셈"
          />
        </div>
        <div style={fieldCol}>
          <label style={labelStyle}>노트 제목 (선택)</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 분수의 나눗셈 핵심"
          />
        </div>
        <div style={fieldCol}>
          <label style={labelStyle}>
            내용 * <span style={{ fontWeight: 400, opacity: 0.7 }}>(마크업: ==형광== **빨강** __파랑__ / # 제목 / - 항목)</span>
          </label>
          <textarea
            style={{ ...inputStyle, minHeight: 220, resize: 'vertical', lineHeight: 1.6 }}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={PLACEHOLDER}
          />
        </div>
        <div style={fieldCol}>
          <label style={labelStyle}>관리자 비밀번호 *</label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="ADMIN_PASSWORD"
          />
        </div>

        {msg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              background: msg.ok ? 'rgba(47,125,71,0.12)' : 'rgba(216,59,59,0.1)',
              color: msg.ok ? '#2f7d47' : '#c0392b',
            }}
          >
            {msg.text}
          </div>
        )}

        <button
          onClick={submit}
          disabled={busy}
          style={{
            border: 'none',
            cursor: busy ? 'wait' : 'pointer',
            borderRadius: 12,
            padding: '14px 18px',
            fontSize: 17,
            fontWeight: 800,
            color: '#fff',
            background: busy ? '#9bb89a' : '#2f7d47',
          }}
        >
          {busy ? '등록 중…' : '📤 시험정리 등록'}
        </button>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 12px' }}>👀 미리보기</h2>
        <HandwrittenNote note={preview} />
      </section>
    </main>
  )
}
