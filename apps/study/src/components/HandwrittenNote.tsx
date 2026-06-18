import React from 'react'
import type { StudyNote } from '../types'

// 한 줄 안의 인라인 마크업(형광/빨강/파랑)을 파싱
function inline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = /(==[^=]+==|\*\*[^*]+\*\*|__[^_]+__)/g
  let last = 0
  let key = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]
    const body = tok.slice(2, -2)
    if (tok.startsWith('==')) {
      nodes.push(
        <mark
          key={key++}
          style={{
            background:
              'linear-gradient(180deg, transparent 10%, #fff07a 10% 85%, transparent 85%)',
            color: 'inherit',
            padding: '0 2px',
          }}
        >
          {body}
        </mark>,
      )
    } else if (tok.startsWith('**')) {
      nodes.push(
        <span key={key++} style={{ color: '#d83b3b', fontWeight: 700 }}>
          {body}
        </span>,
      )
    } else {
      nodes.push(
        <span key={key++} style={{ color: '#2f5fd0', fontWeight: 700 }}>
          {body}
        </span>,
      )
    }
    last = m.index + tok.length
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function Line({ raw }: { raw: string }) {
  if (raw.trim() === '') return <div style={{ height: 32 }} />
  if (raw.startsWith('# ')) {
    return (
      <div
        style={{
          fontSize: 30,
          color: '#1f3a8a',
          fontWeight: 700,
          textDecoration: 'underline',
          textDecorationColor: '#f2b8b8',
          textUnderlineOffset: 6,
          margin: '4px 0',
          lineHeight: '40px',
        }}
      >
        {inline(raw.slice(2))}
      </div>
    )
  }
  if (raw.startsWith('- ')) {
    return (
      <div style={{ display: 'flex', gap: 8, lineHeight: '32px' }}>
        <span style={{ color: '#d83b3b' }}>✓</span>
        <span>{inline(raw.slice(2))}</span>
      </div>
    )
  }
  return <div style={{ lineHeight: '32px' }}>{inline(raw)}</div>
}

export default function HandwrittenNote({ note }: { note: StudyNote }) {
  const lines = note.content.replace(/\r/g, '').split('\n')
  return (
    <article
      className="font-hand"
      style={{
        position: 'relative',
        background:
          'repeating-linear-gradient(transparent, transparent 31px, var(--line) 31px, var(--line) 32px), var(--paper)',
        borderRadius: 10,
        padding: '20px 26px 28px 56px',
        fontSize: 23,
        color: '#243b6b',
        boxShadow: '0 18px 36px rgba(0,0,0,0.18)',
        backgroundPosition: '0 12px',
        overflow: 'hidden',
      }}
    >
      {/* 빨간 세로 여백선 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 40,
          width: 2,
          background: 'var(--margin-line)',
          opacity: 0.7,
        }}
        aria-hidden
      />
      {note.title && (
        <h3
          style={{
            fontSize: 34,
            margin: '0 0 8px',
            color: '#c0392b',
            fontWeight: 700,
            lineHeight: '40px',
          }}
        >
          ★ {note.title}
        </h3>
      )}
      {lines.map((l, i) => (
        <Line key={i} raw={l} />
      ))}
      {note.source && (
        <a
          href={note.source}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 14,
            fontSize: 15,
            color: '#7a8aa5',
            fontFamily: 'system-ui',
          }}
        >
          출처: Threads ↗
        </a>
      )}
    </article>
  )
}
