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

// ───────────────────────── 난이도(초보 실수) 시스템 ─────────────────────────
// GNU Go 는 최저 레벨에서도 몇 급 수준으로 강해서, 레벨만으로는 초보가 이길 만큼
// 약해지지 않습니다. 그래서 낮은 단일수록 일정 확률로 엔진의 "정답 수" 대신
// 합법적이지만 평범한 랜덤 수를 두게 해 실제 난이도 곡선을 만듭니다.

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
  return { libs, group };
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

// 낮은 난이도용 "초보 수": 합법적이고 자충수(자기 단수)가 아닌 빈 점 중 랜덤.
// 70% 확률로 기존 돌에 인접한 점을 골라 너무 동떨어진 수를 피합니다.
function beginnerMove(aiColor: 'B' | 'W'): string {
  const { occ, n } = reconstructBoard();
  const color = aiColor === 'B' ? 1 : 2;
  const opp = color === 1 ? 2 : 1;
  const engaged: [number, number][] = [];
  const all: [number, number][] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (occ[cellIdx(c, r, n)] !== 0) continue;
      occ[cellIdx(c, r, n)] = color;
      let captures = false;
      for (const [nc, nr] of cellNeighbors(c, r, n)) {
        if (occ[cellIdx(nc, nr, n)] === opp && groupLiberties(occ, n, nc, nr).libs === 0) {
          captures = true;
        }
      }
      const { libs } = groupLiberties(occ, n, c, r);
      occ[cellIdx(c, r, n)] = 0;
      if (libs === 0 && !captures) continue;        // 자살수(불법)
      if (libs <= 1 && !captures) continue;          // 멍청한 자충수 회피
      all.push([c, r]);
      if (cellNeighbors(c, r, n).some(([nc, nr]) => occ[cellIdx(nc, nr, n)] !== 0)) {
        engaged.push([c, r]);
      }
    }
  }
  const pool = engaged.length && Math.random() < 0.7 ? engaged : all.length ? all : engaged;
  if (!pool.length) return 'pass';
  const [c, r] = pool[Math.floor(Math.random() * pool.length)];
  return `${GTP_LETTERS[c]}${n - r}`;
}

// 단(1~9)별 "실수(랜덤 수)" 확률 — 낮을수록 약함
function mistakeProbability(dan: number): number {
  const table: Record<number, number> = {
    1: 0.85, 2: 0.68, 3: 0.5, 4: 0.35, 5: 0.22, 6: 0.12, 7: 0.05, 8: 0, 9: 0,
  };
  return table[Math.max(1, Math.min(9, Math.round(dan)))] ?? 0;
}

/**
 * AI 수 생성 (GNU Go 진정한 엔진 호출 + 난이도별 초보 실수 주입)
 */
function generateMove(aiColor: 'B' | 'W', danLevel: number): string {
  // 낮은 난이도: 일정 확률로 엔진 대신 평범한 초보 수
  const p = mistakeProbability(danLevel);
  if (p > 0 && Math.random() < p) {
    const rnd = beginnerMove(aiColor);
    if (rnd !== 'pass') {
      console.log(`[Engine] 초보 수 (난이도 ${danLevel}단, p=${p}): ${rnd}`);
      return rnd;
    }
    // 둘 곳을 못 찾으면 엔진으로 폴백
  }

  const sgf = buildSgf();

  // 단(1~9단)을 엔진 레벨(1~10)으로 매핑
  const engineLevel = Math.max(1, Math.min(10, danLevel));

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
