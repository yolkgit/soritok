/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * GNU Go WASM Worker
 * 
 * GNU Go의 _play(level, sgf) 함수를 활용하여 실제 AI 엔진을 작동시킵니다.
 * 이전에 사용된 _score()는 형세 판단 기능만 수행하므로 전투(수읽기) 능력이 없었습니다.
 * _play() 함수는 SGF를 입력받아 AI 수읽기를 수행하고 결과 SGF를 반환합니다.
 */

// Emscripten 모듈 초기화
// 경로는 vite base('/gnugo/')에 맞춰 /gnugo/ 하위에서 로드합니다.
(self as any).exports = self;
(self as any).importScripts('/gnugo/gnugo.js');
console.log('[GoWorker] gnugo.js loaded');

let ModuleRef: any = null;
let messageQueue: MessageEvent[] = [];
let engineReady = false;

// 게임 상태
let currentBoardSize = 13;
let currentLevel = 1;
let moveHistory: { color: 'B' | 'W'; vertex: string }[] = [];

// GTP 좌표 ↔ SGF 좌표 변환
const GTP_LETTERS = 'ABCDEFGHJKLMNOPQRST'; // I를 건너뛰는 GTP 표준

function gtpToSgf(vertex: string, boardSize: number): string {
  if (!vertex || vertex.toLowerCase() === 'pass' || vertex.toLowerCase() === 'resign') return '';
  const letter = vertex.charAt(0).toUpperCase();
  const number = parseInt(vertex.substring(1), 10);
  
  const col = GTP_LETTERS.indexOf(letter);
  const row = boardSize - number;
  
  if (col < 0 || row < 0 || col >= boardSize || row >= boardSize) return '';
  
  // SGF 좌표: a=0부터 시작, 열(col) + 행(row)
  return String.fromCharCode(97 + col) + String.fromCharCode(97 + row);
}

function sgfToGtp(sgfCoord: string, boardSize: number): string {
  if (!sgfCoord || sgfCoord.length < 2) return 'pass';
  const col = sgfCoord.charCodeAt(0) - 97;
  const row = sgfCoord.charCodeAt(1) - 97;
  
  if (col < 0 || col >= boardSize || row < 0 || row >= boardSize) return 'pass';
  
  const gtpLetter = GTP_LETTERS[col];
  const gtpNumber = boardSize - row;
  return `${gtpLetter}${gtpNumber}`;
}

/**
 * 현재 기보를 SGF 문자열로 생성
 */
function buildSgf(): string {
  let sgf = `(;FF[4]GM[1]SZ[${currentBoardSize}]KM[6.5]`;
  
  for (const move of moveHistory) {
    const sgfCoord = gtpToSgf(move.vertex, currentBoardSize);
    if (sgfCoord) {
      sgf += `;${move.color}[${sgfCoord}]`;
    } else {
      // pass
      sgf += `;${move.color}[]`;
    }
  }
  
  sgf += ')\n';
  return sgf;
}

// ───────────────────────── 난이도(티어) 시스템 ─────────────────────────
// 단(1~9)을 3개 티어로 나눕니다: 1~3단 초등용(하/중/상), 4~6단 중학생용(하/중/상),
// 7~9단 성인·선수용. 낮은 티어도 "따라만 두는" 랜덤이 아니라 기본 공방
// (단수 몰린 돌 살리기·상대 단수 따내기·압박)은 확률적으로 수행하고,
// 엔진 수 비율(enginePct)과 엔진 레벨로 실력 곡선을 만듭니다.

const cellIdx = (c: number, r: number, n: number) => r * n + c;

function cellNeighbors(c: number, r: number, n: number): [number, number][] {
  const res: [number, number][] = [];
  if (c > 0) res.push([c - 1, r]);
  if (c < n - 1) res.push([c + 1, r]);
  if (r > 0) res.push([c, r - 1]);
  if (r < n - 1) res.push([c, r + 1]);
  return res;
}

// 한 그룹의 활로(자유도) 수와 돌 목록 (occ: 0 빈칸 / 1 흑 / 2 백)
function groupLiberties(occ: Uint8Array, n: number, c0: number, r0: number) {
  const color = occ[cellIdx(c0, r0, n)];
  const stack: [number, number][] = [[c0, r0]];
  const seen = new Set<number>([cellIdx(c0, r0, n)]);
  const libSeen = new Set<number>();
  let libs = 0;
  const group: [number, number][] = [];
  while (stack.length) {
    const [c, r] = stack.pop()!;
    group.push([c, r]);
    for (const [nc, nr] of cellNeighbors(c, r, n)) {
      const id = cellIdx(nc, nr, n);
      if (occ[id] === 0) {
        if (!libSeen.has(id)) { libSeen.add(id); libs++; }
      } else if (occ[id] === color && !seen.has(id)) {
        seen.add(id);
        stack.push([nc, nr]);
      }
    }
  }
  return {
    libs,
    group,
    // 활로 좌표 목록 (id = r*n + c)
    libPts: [...libSeen].map((id) => [id % n, Math.floor(id / n)] as [number, number]),
  };
}

// GTP 정점("D4") → 열/행 인덱스 (gtpToSgf 와 동일 좌표 규칙)
function gtpToColRow(vertex: string, n: number): { col: number; row: number } | null {
  if (!vertex || /pass|resign/i.test(vertex)) return null;
  const col = GTP_LETTERS.indexOf(vertex.charAt(0).toUpperCase());
  const row = n - parseInt(vertex.substring(1), 10);
  if (col < 0 || row < 0 || col >= n || row >= n) return null;
  return { col, row };
}

// moveHistory 를 따라 보드 점유 상태를 복원(따냄 반영)
function reconstructBoard(): { occ: Uint8Array; n: number } {
  const n = currentBoardSize;
  const occ = new Uint8Array(n * n);
  for (const mv of moveHistory) {
    const p = gtpToColRow(mv.vertex, n);
    if (!p) continue;
    const color = mv.color === 'B' ? 1 : 2;
    const opp = color === 1 ? 2 : 1;
    occ[cellIdx(p.col, p.row, n)] = color;
    for (const [nc, nr] of cellNeighbors(p.col, p.row, n)) {
      if (occ[cellIdx(nc, nr, n)] === opp) {
        const { libs, group } = groupLiberties(occ, n, nc, nr);
        if (libs === 0) for (const [gc, gr] of group) occ[cellIdx(gc, gr, n)] = 0;
      }
    }
  }
  return { occ, n };
}

// 단(1~9)별 티어 설정
interface DanConfig {
  enginePct: number;   // GNU Go 엔진 수를 그대로 쓰는 확률
  engineLevel: number; // 엔진 사고 레벨 (1~10)
  captureP: number;    // 단수 몰린 상대 돌을 따내는 확률 (공격)
  saveP: number;       // 단수 몰린 내 돌을 살리는 확률 (방어)
  atariP: number;      // 활로 2개인 상대 그룹을 단수 치는 확률 (압박)
}

const DAN_TABLE: Record<number, DanConfig> = {
  // 초등용 (하/중/상) — 기본 공방은 하되 빈틈이 많아 아이도 이길 수 있음
  1: { enginePct: 0.15, engineLevel: 1, captureP: 0.6, saveP: 0.5, atariP: 0.15 },
  2: { enginePct: 0.3, engineLevel: 1, captureP: 0.75, saveP: 0.65, atariP: 0.3 },
  3: { enginePct: 0.45, engineLevel: 2, captureP: 0.9, saveP: 0.8, atariP: 0.45 },
  // 중학생용 (하/중/상) — 대부분 엔진 수, 전술 실수 드묾
  4: { enginePct: 0.6, engineLevel: 3, captureP: 0.95, saveP: 0.9, atariP: 0.6 },
  5: { enginePct: 0.75, engineLevel: 5, captureP: 1, saveP: 0.95, atariP: 0.75 },
  6: { enginePct: 0.9, engineLevel: 7, captureP: 1, saveP: 1, atariP: 0.9 },
  // 성인·선수용 — 순수 GNU Go 엔진 최대 사고 레벨
  7: { enginePct: 1, engineLevel: 8, captureP: 1, saveP: 1, atariP: 1 },
  8: { enginePct: 1, engineLevel: 9, captureP: 1, saveP: 1, atariP: 1 },
  9: { enginePct: 1, engineLevel: 10, captureP: 1, saveP: 1, atariP: 1 },
};

// (c,r)에 color 돌을 놓았을 때를 시뮬레이션 — 따냄 반영, 불법(자살)수면 null
function simulatePlace(occ: Uint8Array, n: number, c: number, r: number, color: number) {
  const idx = cellIdx(c, r, n);
  if (occ[idx] !== 0) return null;
  const opp = color === 1 ? 2 : 1;
  const next = occ.slice();
  next[idx] = color;
  let captured = 0;
  let capturedSingleAt = -1;
  for (const [nc, nr] of cellNeighbors(c, r, n)) {
    const nid = cellIdx(nc, nr, n);
    if (next[nid] !== opp) continue;
    const { libs, group } = groupLiberties(next, n, nc, nr);
    if (libs === 0) {
      for (const [gc, gr] of group) next[cellIdx(gc, gr, n)] = 0;
      captured += group.length;
      if (group.length === 1) capturedSingleAt = cellIdx(group[0][0], group[0][1], n);
    }
  }
  const { libs } = groupLiberties(next, n, c, r);
  if (libs === 0 && captured === 0) return null;
  return { next, libs, captured, capturedSingleAt };
}

// 방금 상대가 둔 한 점을 곧바로 되따는 패(ko) 모양이면 true — 동형반복으로
// 본 게임(App) 쪽에서 거부되어 게임이 멈추는 것을 예방
function isKoRetake(sim: { libs: number; captured: number; capturedSingleAt: number }, n: number): boolean {
  if (sim.captured !== 1 || sim.libs !== 1 || sim.capturedSingleAt < 0) return false;
  const last = moveHistory[moveHistory.length - 1];
  if (!last) return false;
  const p = gtpToColRow(last.vertex, n);
  return p !== null && sim.capturedSingleAt === cellIdx(p.col, p.row, n);
}

// 보드 위 모든 그룹 스캔
type GroupInfo = { color: number; size: number; libs: number; libPts: [number, number][]; cells: [number, number][] };
function scanGroups(occ: Uint8Array, n: number): GroupInfo[] {
  const seen = new Set<number>();
  const res: GroupInfo[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const id = cellIdx(c, r, n);
      if (occ[id] === 0 || seen.has(id)) continue;
      const { libs, group, libPts } = groupLiberties(occ, n, c, r);
      for (const [gc, gr] of group) seen.add(cellIdx(gc, gr, n));
      res.push({ color: occ[id], size: group.length, libs, libPts, cells: group });
    }
  }
  return res;
}

// 평범한 전개 수: 기존 돌 근처 우선, 자살수·자충수·패 되따기 회피, 초반 1선 회피
function decentRandom(occ: Uint8Array, n: number, color: number): string {
  const engaged: [number, number][] = [];
  const normal: [number, number][] = [];
  const early = moveHistory.length < n * 2; // 초반 판단
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (occ[cellIdx(c, r, n)] !== 0) continue;
      const sim = simulatePlace(occ, n, c, r, color);
      if (!sim) continue; // 자살수
      if (isKoRetake(sim, n)) continue;
      if (sim.libs <= 1 && sim.captured === 0) continue; // 자충수
      if (early && (c === 0 || r === 0 || c === n - 1 || r === n - 1)) continue; // 초반 1선 회피
      normal.push([c, r]);
      if (cellNeighbors(c, r, n).some(([nc, nr]) => occ[cellIdx(nc, nr, n)] !== 0)) {
        engaged.push([c, r]);
      }
    }
  }
  const pool = engaged.length && Math.random() < 0.7 ? engaged : normal;
  if (!pool.length) return 'pass'; // 둘 곳 없으면 엔진에 위임
  const [c, r] = pool[Math.floor(Math.random() * pool.length)];
  return `${GTP_LETTERS[c]}${n - r}`;
}

// 휴리스틱 수: 낮은 티어도 기본 공방(따냄→살림→단수 압박)은 하되 확률로 빈틈을 남김
function heuristicMove(aiColor: 'B' | 'W', cfg: DanConfig): string {
  const { occ, n } = reconstructBoard();
  const color = aiColor === 'B' ? 1 : 2;
  const opp = color === 1 ? 2 : 1;
  const toGtp = (c: number, r: number) => `${GTP_LETTERS[c]}${n - r}`;
  const groups = scanGroups(occ, n);

  // 1) 공격: 단수 몰린 상대 그룹 따내기 (큰 그룹 우선)
  if (Math.random() < cfg.captureP) {
    const targets = groups.filter((g) => g.color === opp && g.libs === 1).sort((a, b) => b.size - a.size);
    for (const t of targets) {
      const [c, r] = t.libPts[0];
      const sim = simulatePlace(occ, n, c, r, color);
      if (sim && !isKoRetake(sim, n)) return toGtp(c, r);
    }
  }

  // 2) 방어: 단수 몰린 내 그룹 살리기 (도망 → 안 되면 되따냄)
  if (Math.random() < cfg.saveP) {
    const mine = groups.filter((g) => g.color === color && g.libs === 1).sort((a, b) => b.size - a.size);
    for (const g of mine) {
      const [c, r] = g.libPts[0];
      const run = simulatePlace(occ, n, c, r, color);
      if (run && run.libs >= 2) return toGtp(c, r); // 도망 성공 (활로 2 이상)
      for (const t of groups.filter((x) => x.color === opp && x.libs === 1)) {
        const [tc, tr] = t.libPts[0];
        const cap = simulatePlace(occ, n, tc, tr, color);
        if (!cap || isKoRetake(cap, n)) continue;
        const after = groupLiberties(cap.next, n, g.cells[0][0], g.cells[0][1]);
        if (after.libs >= 2) return toGtp(tc, tr); // 되따내서 삶
      }
    }
  }

  // 3) 압박: 활로 2개인 상대 그룹 단수 치기 (내 돌이 안전한 자리만)
  if (Math.random() < cfg.atariP) {
    const targets = groups.filter((g) => g.color === opp && g.libs === 2).sort((a, b) => b.size - a.size);
    for (const t of targets) {
      for (const [c, r] of t.libPts) {
        const sim = simulatePlace(occ, n, c, r, color);
        if (sim && sim.libs >= 2 && !isKoRetake(sim, n)) return toGtp(c, r);
      }
    }
  }

  // 4) 평범한 전개 수
  return decentRandom(occ, n, color);
}

/**
 * AI 수 생성 — 티어별로 GNU Go 엔진 수와 휴리스틱 수를 혼합
 */
function generateMove(aiColor: 'B' | 'W', danLevel: number): string {
  const cfg = DAN_TABLE[Math.max(1, Math.min(9, Math.round(danLevel)))] ?? DAN_TABLE[9];

  // 낮은 티어: 일정 확률로 엔진 대신 휴리스틱 수 (기본 공방은 유지)
  if (Math.random() >= cfg.enginePct) {
    const mv = heuristicMove(aiColor, cfg);
    if (mv !== 'pass') {
      console.log(`[Engine] 휴리스틱 수 (${danLevel}단): ${mv}`);
      return mv;
    }
    // 둘 곳을 못 찾으면 엔진으로 폴백
  }

  const sgf = buildSgf();
  const engineLevel = cfg.engineLevel;

  console.log(`[Engine] Generating move with real GNU Go AI... Level: ${engineLevel}`);
  
  try {
    // _play(level, sgf) 호출. 문자열 포인터를 반환합니다.
    const resPtr = ModuleRef.ccall('play', 'number', ['number', 'string'], [engineLevel, sgf]);
    
    if (resPtr === 0) {
      console.error('[Engine] _play returned null pointer!');
      return 'pass';
    }

    // 반환된 SGF 문자열 읽기
    let resultSgf = '';
    let i = resPtr;
    while (ModuleRef.HEAPU8[i] !== 0 && (i - resPtr) < 65536) {
      resultSgf += String.fromCharCode(ModuleRef.HEAPU8[i]);
      i++;
    }

    // SGF에서 마지막 수를 추출합니다.
    // 결과 SGF 예시: ...;B[ee];W[ff]C[load and analyze mode])
    const colorChar = aiColor === 'B' ? 'B' : 'W';
    
    // 정규식으로 마지막 해당 색상의 수를 찾습니다.
    const moveRegex = new RegExp(`;${colorChar}\\[([a-z]{0,2})\\]`, 'gi');
    let match;
    let lastMatchStr = '';
    
    while ((match = moveRegex.exec(resultSgf)) !== null) {
      lastMatchStr = match[1];
    }
    
    if (!lastMatchStr) {
      return 'pass';
    }
    
    const gtpMove = sgfToGtp(lastMatchStr, currentBoardSize);
    console.log(`[Engine] GNU Go decided: ${gtpMove}`);
    return gtpMove;
    
  } catch (e) {
    console.error('[Engine] Exception in GNU Go Engine:', e);
    return 'pass';
  }
}

// Module 초기화
const Module: any = {
  noInitialRun: true,
  print: (text: string) => console.log('[GNUGO STDOUT]', text),
  printErr: (text: string) => console.warn('[GNUGO STDERR]', text),

  onRuntimeInitialized: () => {
    console.log('[GoWorker] GNU Go WASM Runtime initialized!');
    ModuleRef = Module;
    engineReady = true;

    // 대기 메시지 처리
    console.log(`[GoWorker] Processing ${messageQueue.length} queued messages`);
    while (messageQueue.length > 0) {
      const msg = messageQueue.shift()!;
      processMessage(msg);
    }

    self.postMessage({ type: 'READY' });
  },

  locateFile: (path: string) => {
    if (path === 'gnugo.wasm') return '/gnugo/gnugo.wasm';
    return path;
  },

  onAbort: (what: any) => {
    console.error('[GoWorker] Aborted:', what);
    self.postMessage({ type: 'ERROR', payload: { message: String(what) } });
  },
};

try {
  (self as any).exports.init(Module);
} catch (e) {
  console.error('[GoWorker] Init error:', e);
  self.postMessage({ type: 'ERROR', payload: { message: String(e) } });
}

function processMessage(e: MessageEvent) {
  const { type, payload } = e.data;

  switch (type) {
    case 'INIT': {
      const { boardSize, danLevel } = payload;
      currentBoardSize = boardSize;
      currentLevel = danLevel;
      moveHistory = [];
      console.log(`[Engine] Init: board=${boardSize}, dan=${danLevel}단`);
      break;
    }

    case 'PLAY': {
      const { color, vertex } = payload;
      const c = color === 'black' ? 'B' : 'W';
      moveHistory.push({ color: c as 'B' | 'W', vertex: vertex.toUpperCase() });
      console.log(`[Engine] Play: ${color} ${vertex} (total moves: ${moveHistory.length})`);
      break;
    }

    case 'GENMOVE': {
      const { aiColor } = payload;
      const c = aiColor === 'black' ? 'B' : 'W';

      try {
        const gtpMove = generateMove(c, currentLevel);
        
        // AI의 수를 히스토리에 추가
        if (gtpMove.toLowerCase() !== 'pass' && gtpMove.toLowerCase() !== 'resign') {
          moveHistory.push({ color: c, vertex: gtpMove.toUpperCase() });
        }
        
        self.postMessage({ type: 'MOVE', payload: { move: gtpMove } });
      } catch (e) {
        console.error('[Engine] Move generation failed:', e);
        self.postMessage({ type: 'MOVE', payload: { move: 'pass' } });
      }
      break;
    }

    case 'RESET': {
      moveHistory = [];
      console.log('[Engine] Board cleared');
      break;
    }

    default:
      console.warn('[GoWorker] Unknown message type:', type);
  }
}

self.onmessage = function (e: MessageEvent) {
  if (!engineReady) {
    console.log('[GoWorker] Not ready, queuing:', e.data.type);
    messageQueue.push(e);
    return;
  }
  processMessage(e);
};
