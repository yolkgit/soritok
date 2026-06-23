import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

type Board = number[][]
const SIZE = 4

const empty = (): Board =>
  Array.from({ length: SIZE }, () => Array(SIZE).fill(0))

function addRandom(b: Board): Board {
  const cells: [number, number][] = []
  b.forEach((row, r) => row.forEach((v, c) => v === 0 && cells.push([r, c])))
  if (!cells.length) return b
  const [r, c] = cells[Math.floor(Math.random() * cells.length)]
  b[r][c] = Math.random() < 0.9 ? 2 : 4
  return b
}

function start(): Board {
  return addRandom(addRandom(empty()))
}

const transpose = (b: Board): Board => b[0].map((_, c) => b.map((row) => row[c]))
const reverse = (b: Board): Board => b.map((row) => [...row].reverse())

// 한 줄을 왼쪽으로 압축+병합, 얻은 점수 반환
function slideRow(row: number[]): { row: number[]; gained: number } {
  const nums = row.filter((v) => v !== 0)
  let gained = 0
  for (let i = 0; i < nums.length - 1; i++) {
    if (nums[i] === nums[i + 1]) {
      nums[i] *= 2
      gained += nums[i]
      nums.splice(i + 1, 1)
    }
  }
  while (nums.length < SIZE) nums.push(0)
  return { row: nums, gained }
}

type Dir = 'left' | 'right' | 'up' | 'down'

function move(b: Board, dir: Dir): { board: Board; gained: number; moved: boolean } {
  let work = b.map((r) => [...r])
  if (dir === 'up') work = transpose(work)
  if (dir === 'down') work = reverse(transpose(work))
  if (dir === 'right') work = reverse(work)

  let gained = 0
  work = work.map((row) => {
    const res = slideRow(row)
    gained += res.gained
    return res.row
  })

  if (dir === 'up') work = transpose(work)
  if (dir === 'down') work = transpose(reverse(work))
  if (dir === 'right') work = reverse(work)

  const moved = JSON.stringify(work) !== JSON.stringify(b)
  return { board: work, gained, moved }
}

function canMove(b: Board): boolean {
  return (['left', 'right', 'up', 'down'] as Dir[]).some((d) => move(b, d).moved)
}

const TILE: Record<number, { bg: string; fg: string }> = {
  0: { bg: 'rgba(255,255,255,0.08)', fg: 'transparent' },
  2: { bg: '#eee4da', fg: '#776e65' },
  4: { bg: '#ede0c8', fg: '#776e65' },
  8: { bg: '#f2b179', fg: '#fff' },
  16: { bg: '#f59563', fg: '#fff' },
  32: { bg: '#f67c5f', fg: '#fff' },
  64: { bg: '#f65e3b', fg: '#fff' },
  128: { bg: '#edcf72', fg: '#fff' },
  256: { bg: '#edcc61', fg: '#fff' },
  512: { bg: '#edc850', fg: '#fff' },
  1024: { bg: '#edc53f', fg: '#fff' },
  2048: { bg: '#edc22e', fg: '#fff' },
}

export default function Game2048({ onScore, onGameOver }: GameProps) {
  const [board, setBoard] = useState<Board>(start)
  const [moveSeq, setMoveSeq] = useState(0)
  const boardRef = useRef(board)
  const prevRef = useRef<Board>(board)
  const scoreRef = useRef(0)
  const overRef = useRef(false)

  useEffect(() => {
    prevRef.current = board
  }, [board])

  const doMove = useCallback(
    (dir: Dir) => {
      if (overRef.current) return
      const { board: nb, gained, moved } = move(boardRef.current, dir)
      if (!moved) return
      addRandom(nb)
      boardRef.current = nb
      setBoard(nb.map((r) => [...r]))
      setMoveSeq((s) => s + 1)
      const ns = scoreRef.current + gained
      scoreRef.current = ns
      onScore(ns)
      if (!canMove(nb)) {
        overRef.current = true
        onGameOver(ns)
      }
    },
    [onScore, onGameOver],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Dir> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowUp: 'up',
        ArrowDown: 'down',
      }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        doMove(dir)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [doMove])

  // 터치 스와이프
  const touch = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left')
    else doMove(dy > 0 ? 'down' : 'up')
    touch.current = null
  }

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        화살표 키 또는 스와이프로 같은 숫자를 합쳐 2048을 만들어요
      </p>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          display: 'inline-grid',
          gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
          gap: 8,
          padding: 8,
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 12,
          touchAction: 'none',
        }}
      >
        {board.flat().map((v, i) => {
          const t = TILE[v] ?? TILE[2048]
          const pv = prevRef.current[Math.floor(i / SIZE)]?.[i % SIZE] ?? 0
          let anim = ''
          if (v !== 0) {
            if (pv === 0) anim = 'stk-pop 0.16s ease'
            else if (pv !== v) anim = 'stk-bump 0.16s ease'
          }
          return (
            <div
              key={anim ? `${i}-${moveSeq}` : `${i}`}
              style={{
                width: 'min(18vw, 74px)',
                height: 'min(18vw, 74px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                background: t.bg,
                color: t.fg,
                fontWeight: 800,
                fontSize: v >= 1024 ? 22 : v >= 128 ? 26 : 30,
                animation: anim || undefined,
              }}
            >
              {v || ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
