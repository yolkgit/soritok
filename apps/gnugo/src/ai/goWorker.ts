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

/**
 * AI 수 생성 (GNU Go 진정한 엔진 호출)
 */
function generateMove(aiColor: 'B' | 'W', danLevel: number): string {
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
