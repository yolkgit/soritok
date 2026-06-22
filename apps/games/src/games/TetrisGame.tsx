import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'

const COLS = 10
const ROWS = 20
const CELL = 26

type Matrix = number[][]
type Cell = string | 0
type Act = 'l' | 'r' | 'rot' | 'rotL' | 'soft' | 'hard' | 'hold' | 'pause'

// 7 테트로미노 (id / 모양 / 색)
const SHAPES: { id: number; m: Matrix; c: string }[] = [
  { id: 0, m: [[1, 1, 1, 1]], c: '#36cfe6' }, // I
  { id: 1, m: [[1, 1], [1, 1]], c: '#f7d23e' }, // O
  { id: 2, m: [[0, 1, 0], [1, 1, 1]], c: '#c069f0' }, // T
  { id: 3, m: [[0, 1, 1], [1, 1, 0]], c: '#54e07c' }, // S
  { id: 4, m: [[1, 1, 0], [0, 1, 1]], c: '#ff6b6b' }, // Z
  { id: 5, m: [[1, 0, 0], [1, 1, 1]], c: '#5b8cf0' }, // J
  { id: 6, m: [[0, 0, 1], [1, 1, 1]], c: '#f5a347' }, // L
]

const LINE_SCORE = [0, 40, 100, 300, 1200]
const LOCK_DELAY = 420
const clone = (m: Matrix): Matrix => m.map((r) => [...r])
const rotateCW = (m: Matrix): Matrix => m[0].map((_, i) => m.map((r) => r[i]).reverse())

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function paintCell(
  ctx: CanvasRenderingContext2D,
  gx: number,
  gy: number,
  color: string,
  cell: number,
  opts: { ghost?: boolean; alpha?: number } = {},
) {
  const x = gx * cell
  const y = gy * cell
  ctx.save()
  if (opts.alpha != null) ctx.globalAlpha = opts.alpha
  if (opts.ghost) {
    ctx.strokeStyle = color
    ctx.globalAlpha = 0.5
    ctx.lineWidth = 2
    roundRect(ctx, x + 2.5, y + 2.5, cell - 5, cell - 5, 5)
    ctx.stroke()
  } else {
    ctx.fillStyle = color
    roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 5)
    ctx.fill()
    const g = ctx.createLinearGradient(x, y, x, y + cell)
    g.addColorStop(0, 'rgba(255,255,255,0.5)')
    g.addColorStop(0.45, 'rgba(255,255,255,0.05)')
    g.addColorStop(1, 'rgba(0,0,0,0.22)')
    ctx.fillStyle = g
    roundRect(ctx, x + 1, y + 1, cell - 2, cell - 2, 5)
    ctx.fill()
  }
  ctx.restore()
}

export default function TetrisGame({ onScore, onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextRef = useRef<HTMLCanvasElement>(null)
  const holdRef = useRef<HTMLCanvasElement>(null)
  const actRef = useRef<(a: Act) => void>(() => {})
  const [lines, setLines] = useState(0)
  const [level, setLevel] = useState(1)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    const nctx = nextRef.current!.getContext('2d')!
    const hctx = holdRef.current!.getContext('2d')!

    const well: Cell[][] = Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0))
    let bag: number[] = []
    const pull = () => {
      if (!bag.length) {
        bag = [0, 1, 2, 3, 4, 5, 6]
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[bag[i], bag[j]] = [bag[j], bag[i]]
        }
      }
      return SHAPES[bag.pop()!]
    }

    let cur = pull()
    let nxt = pull()
    let pm = clone(cur.m)
    let pc = cur.c
    let pid = cur.id
    let px = Math.floor((COLS - pm[0].length) / 2)
    let py = 0
    let holdId: number | null = null
    let canHold = true

    let score = 0
    let nLines = 0
    let lvl = 1
    let dropInterval = 800
    let dropCounter = 0
    let lockCounter = 0
    let lockResets = 0
    let grounded = false
    let phase: 'play' | 'clearing' | 'over' = 'play'
    let clearRows: number[] = []
    let clearTimer = 0
    let isPaused = false
    let raf = 0
    let last = performance.now()

    const speedFor = (l: number) => Math.max(90, Math.round(800 * Math.pow(0.82, l - 1)))

    function collide(m: Matrix, ox: number, oy: number): boolean {
      for (let y = 0; y < m.length; y++)
        for (let x = 0; x < m[y].length; x++) {
          if (!m[y][x]) continue
          const nx = ox + x
          const ny = oy + y
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true
          if (ny >= 0 && well[ny][nx]) return true
        }
      return false
    }

    function setPieceFrom(s: { id: number; m: Matrix; c: string }) {
      pm = clone(s.m)
      pc = s.c
      pid = s.id
      px = Math.floor((COLS - pm[0].length) / 2)
      py = 0
      grounded = false
      lockCounter = 0
      lockResets = 0
    }

    function spawnNext() {
      cur = nxt
      nxt = pull()
      canHold = true
      setPieceFrom(cur)
      if (collide(pm, px, py)) gameOver()
    }

    function gameOver() {
      phase = 'over'
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
      onGameOver(score)
    }

    function resetLock() {
      if (grounded && lockResets < 15) {
        lockCounter = 0
        lockResets++
      }
    }

    function doLock() {
      pm.forEach((row, y) =>
        row.forEach((v, x) => {
          if (v && py + y >= 0) well[py + y][px + x] = pc
        }),
      )
      clearRows = []
      for (let y = 0; y < ROWS; y++) if (well[y].every((c) => c !== 0)) clearRows.push(y)
      if (clearRows.length) {
        phase = 'clearing'
        clearTimer = 0
      } else {
        spawnNext()
      }
    }

    function finalizeClear() {
      for (const y of clearRows) {
        well.splice(y, 1)
        well.unshift(Array<Cell>(COLS).fill(0))
      }
      const n = clearRows.length
      nLines += n
      score += LINE_SCORE[n] * lvl
      onScore(score)
      const newLvl = Math.floor(nLines / 10) + 1
      if (newLvl !== lvl) {
        lvl = newLvl
        dropInterval = speedFor(lvl)
        setLevel(lvl)
      }
      setLines(nLines)
      clearRows = []
      phase = 'play'
      spawnNext()
    }

    function rotate(dir: 1 | -1) {
      let rot = pm
      const turns = dir === 1 ? 1 : 3
      for (let i = 0; i < turns; i++) rot = rotateCW(rot)
      for (const kick of [0, -1, 1, -2, 2]) {
        if (!collide(rot, px + kick, py)) {
          pm = rot
          px += kick
          resetLock()
          return
        }
      }
    }

    function softDrop() {
      if (!collide(pm, px, py + 1)) {
        py++
        score += 1
        onScore(score)
        dropCounter = 0
        grounded = false
        lockCounter = 0
      }
    }

    function hardDrop() {
      let d = 0
      while (!collide(pm, px, py + 1)) {
        py++
        d++
      }
      if (d) {
        score += d * 2
        onScore(score)
      }
      doLock()
    }

    function doHold() {
      if (!canHold) return
      if (holdId === null) {
        holdId = pid
        spawnNext()
      } else {
        const swap = SHAPES[holdId]
        holdId = pid
        setPieceFrom(swap)
      }
      canHold = false
    }

    function act(a: Act) {
      if (a === 'pause') {
        isPaused = !isPaused
        setPaused(isPaused)
        last = performance.now()
        return
      }
      if (phase !== 'play' || isPaused) return
      if (a === 'l' && !collide(pm, px - 1, py)) {
        px--
        resetLock()
      } else if (a === 'r' && !collide(pm, px + 1, py)) {
        px++
        resetLock()
      } else if (a === 'rot') rotate(1)
      else if (a === 'rotL') rotate(-1)
      else if (a === 'soft') softDrop()
      else if (a === 'hard') hardDrop()
      else if (a === 'hold') doHold()
    }
    actRef.current = act

    function drawMini(c: CanvasRenderingContext2D, shape: { m: Matrix; c: string } | null) {
      const S = 18
      c.clearRect(0, 0, c.canvas.width, c.canvas.height)
      if (!shape) return
      const w = shape.m[0].length
      const h = shape.m.length
      const ox = (c.canvas.width / S - w) / 2
      const oy = (c.canvas.height / S - h) / 2
      shape.m.forEach((row, y) =>
        row.forEach((v, x) => v && paintCell(c, ox + x, oy + y, shape.c, S)),
      )
    }

    function draw() {
      // 배경 + 그리드
      ctx.fillStyle = '#0c0826'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
      ctx.strokeStyle = 'rgba(255,255,255,0.045)'
      ctx.lineWidth = 1
      for (let x = 1; x < COLS; x++) {
        ctx.beginPath()
        ctx.moveTo(x * CELL, 0)
        ctx.lineTo(x * CELL, ROWS * CELL)
        ctx.stroke()
      }
      for (let y = 1; y < ROWS; y++) {
        ctx.beginPath()
        ctx.moveTo(0, y * CELL)
        ctx.lineTo(COLS * CELL, y * CELL)
        ctx.stroke()
      }
      // 쌓인 블록
      well.forEach((row, y) => row.forEach((c, x) => c && paintCell(ctx, x, y, c, CELL)))

      if (phase === 'clearing') {
        const flash = Math.sin((clearTimer / 180) * Math.PI)
        ctx.fillStyle = `rgba(255,255,255,${0.15 + flash * 0.75})`
        for (const y of clearRows) ctx.fillRect(0, y * CELL, COLS * CELL, CELL)
      } else if (phase === 'play') {
        // 고스트
        let gy = py
        while (!collide(pm, px, gy + 1)) gy++
        pm.forEach((row, y) =>
          row.forEach((v, x) => v && gy + y >= 0 && paintCell(ctx, px + x, gy + y, pc, CELL, { ghost: true })),
        )
        // 현재 조각
        pm.forEach((row, y) =>
          row.forEach((v, x) => v && py + y >= 0 && paintCell(ctx, px + x, py + y, pc, CELL)),
        )
      }

      drawMini(nctx, nxt)
      drawMini(hctx, holdId === null ? null : SHAPES[holdId])
    }

    function loop(time: number) {
      const dt = time - last
      last = time
      if (!isPaused) {
        if (phase === 'play') {
          dropCounter += dt
          if (dropCounter >= dropInterval) {
            dropCounter = 0
            if (!collide(pm, px, py + 1)) {
              py++
              grounded = false
              lockCounter = 0
            } else {
              grounded = true
            }
          }
          if (grounded) {
            lockCounter += dt
            if (lockCounter >= LOCK_DELAY) doLock()
          }
        } else if (phase === 'clearing') {
          clearTimer += dt
          if (clearTimer >= 180) finalizeClear()
        }
      }
      draw()
      if (phase !== 'over') raf = requestAnimationFrame(loop)
    }

    const KEYS: Record<string, Act> = {
      ArrowLeft: 'l',
      ArrowRight: 'r',
      ArrowDown: 'soft',
      ArrowUp: 'rot',
      x: 'rot',
      X: 'rot',
      z: 'rotL',
      Z: 'rotL',
      ' ': 'hard',
      c: 'hold',
      C: 'hold',
      p: 'pause',
      P: 'pause',
    }
    const onKey = (e: KeyboardEvent) => {
      const a = KEYS[e.key]
      if (a) {
        e.preventDefault()
        act(a)
      }
    }
    window.addEventListener('keydown', onKey)

    dropInterval = speedFor(1)
    raf = requestAnimationFrame(loop)

    return () => {
      phase = 'over'
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey)
    }
  }, [onScore, onGameOver])

  const panel: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: '8px 10px',
    minWidth: 96,
  }
  const cap: React.CSSProperties = { fontSize: 11, opacity: 0.6, fontWeight: 700, letterSpacing: 1 }

  const Btn = ({ a, label }: { a: Act; label: string }) => (
    <button
      onClick={() => actRef.current(a)}
      style={{
        flex: 1,
        padding: '13px 0',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'rgba(255,255,255,0.12)',
        color: '#fff',
        fontSize: 18,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ textAlign: 'center', userSelect: 'none' }}>
      <p style={{ opacity: 0.7, fontSize: 13, margin: '0 0 10px' }}>
        ← → 이동 · ↑/X 회전 · Z 반대회전 · ↓ 소프트 · 스페이스 하드드롭 · C 홀드 · P 일시정지
      </p>

      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <canvas
            ref={canvasRef}
            width={COLS * CELL}
            height={ROWS * CELL}
            style={{
              width: 'min(62vw, 230px)',
              height: 'auto',
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
            }}
          />
          {paused && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(12,8,38,0.6)',
                borderRadius: 12,
                fontSize: 20,
                fontWeight: 800,
              }}
            >
              ⏸ 일시정지
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={panel}>
            <div style={cap}>HOLD (C)</div>
            <canvas ref={holdRef} width={72} height={72} style={{ width: 72, height: 72 }} />
          </div>
          <div style={panel}>
            <div style={cap}>NEXT</div>
            <canvas ref={nextRef} width={72} height={72} style={{ width: 72, height: 72 }} />
          </div>
          <div style={panel}>
            <div style={cap}>LEVEL</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{level}</div>
            <div style={{ ...cap, marginTop: 4 }}>LINES</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{lines}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, maxWidth: 360, marginInline: 'auto' }}>
        <Btn a="l" label="◀" />
        <Btn a="rot" label="⟳" />
        <Btn a="r" label="▶" />
        <Btn a="soft" label="▼" />
        <Btn a="hard" label="⤓" />
        <Btn a="hold" label="⤴" />
      </div>
    </div>
  )
}
