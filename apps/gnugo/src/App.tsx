/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CellState, 
  Player, 
  Position, 
  getNeighbors, 
  findGroup, 
  calculateTerritory 
} from './gameLogic';
import { toGtpVertex, toScreenXY } from './ai/gtpUtils';
import { Stone } from './components/Stone';
import { Trophy, RotateCcw, SkipForward, Users, Star, Layers, Monitor, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type GameMode = 'pvp' | 'pve';

const LEVEL_CONFIG: Record<Level, { label: string, description: string, variant: 'cute' | 'professional' }> = {
  1: { label: '1단', description: '초보 유단자', variant: 'cute' },
  2: { label: '2단', description: '기초가 탄탄한 유단자', variant: 'cute' },
  3: { label: '3단', description: '전술을 이해하는 유단자', variant: 'cute' },
  4: { label: '4단', description: '중급 유단자', variant: 'professional' },
  5: { label: '5단', description: '실력이 출중한 유단자', variant: 'professional' },
  6: { label: '6단', description: '고급 전술을 구사하는 유단자', variant: 'professional' },
  7: { label: '7단', description: '프로에 근접한 유단자', variant: 'professional' },
  8: { label: '8단', description: '최정상급 유단자', variant: 'professional' },
  9: { label: '9단', description: '신의 한 수를 찾는 유단자', variant: 'professional' },
};

export default function App() {
  const [level, setLevel] = useState<Level>(1);
  const [boardSize, setBoardSize] = useState<9 | 13 | 19>(13);
  const [gameMode, setGameMode] = useState<GameMode>('pve');

  const [board, setBoard] = useState<CellState[][]>(
    Array(13).fill(null).map(() => Array(13).fill(null))
  );
  const [currentPlayer, setCurrentPlayer] = useState<Player>('black');
  const [captured, setCaptured] = useState({ black: 0, white: 0 });
  const [history, setHistory] = useState<CellState[][][]>([]);
  const [lastMove, setLastMove] = useState<Position | null>(null);
  const [showScore, setShowScore] = useState(false);
  const [scores, setScores] = useState({ 
    black: 0, 
    white: 0, 
    territory: Array(13).fill(null).map(() => Array(13).fill(null)) as CellState[][] 
  });

  // 엔진 상태
  const [engineReady, setEngineReady] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);

  const workerRef = React.useRef<Worker | null>(null);

  // Worker 초기화
  useEffect(() => {
    setEngineReady(false);
    
    const worker = new Worker(new URL('./ai/goWorker.ts', import.meta.url));
    
    worker.onmessage = (e) => {
      const { type, payload } = e.data;
      
      switch (type) {
        case 'READY':
          console.log('[App] GNU Go engine ready!');
          setEngineReady(true);
          break;
          
        case 'ERROR':
          console.error('[App] Worker Error:', payload.message);
          setAiThinking(false);
          break;
          
        case 'MOVE': {
          setAiThinking(false);
          const move = toScreenXY(payload.move, boardSize);
          if (move === 'pass') {
            handlePassRef.current(true);
          } else if (move === 'resign') {
            // resign은 패스로 처리 (교육용 앱에서는 포기 대신 패스)
            handlePassRef.current(true);
          } else {
            handlePlaceStoneRef.current(move.x, move.y, true);
          }
          break;
        }
      }
    };

    worker.onerror = (e) => {
      console.error('[App] Worker crashed:', e.message);
      setAiThinking(false);
    };

    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, [boardSize]);

  // 엔진 설정 동기화 (보드 크기, 난이도)
  useEffect(() => {
    if (workerRef.current && engineReady) {
      workerRef.current.postMessage({
        type: 'INIT',
        payload: { boardSize, danLevel: level }
      });
    }
  }, [boardSize, level, engineReady]);

  const handleReset = useCallback(() => {
    setBoard(Array(boardSize).fill(null).map(() => Array(boardSize).fill(null)));
    setCurrentPlayer('black');
    setCaptured({ black: 0, white: 0 });
    setHistory([]);
    setLastMove(null);
    setShowScore(false);
    setAiThinking(false);
    
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'RESET' });
    }
  }, [boardSize]);

  // 레벨, 모드, 보드 크기 변경 시 리셋
  useEffect(() => {
    handleReset();
  }, [level, gameMode, boardSize, handleReset]);

  const handlePlaceStone = (x: number, y: number, isAiMove = false) => {
    if (board[y][x] !== null || showScore) return;
    // PvE 모드에서 AI 차례일 때 클릭 방지
    if (gameMode === 'pve' && currentPlayer === 'white' && !isAiMove) return;

    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = currentPlayer;

    // 따먹기 로직
    let capturedAny = false;
    let totalCaptured = 0;
    const opponent = currentPlayer === 'black' ? 'white' : 'black';
    const neighbors = getNeighbors({ x, y }, boardSize);

    neighbors.forEach(n => {
      if (newBoard[n.y][n.x] === opponent) {
        const { group, liberties } = findGroup(newBoard, n, boardSize);
        if (liberties.length === 0) {
          group.forEach(p => {
            newBoard[p.y][p.x] = null;
            totalCaptured++;
          });
          capturedAny = true;
        }
      }
    });

    // 자살수 체크
    const { liberties: ownLiberties } = findGroup(newBoard, { x, y }, boardSize);
    if (ownLiberties.length === 0 && !capturedAny) {
      return;
    }

    // 패 규칙
    if (history.length > 0) {
      const prevBoard = history[history.length - 1];
      const isSameAsPrev = newBoard.every((row, ry) => 
        row.every((cell, rx) => cell === prevBoard[ry][rx])
      );
      if (isSameAsPrev) return;
    }

    // Worker에 수 전달 (AI 수가 아닐 때만)
    if (workerRef.current && !isAiMove) {
      workerRef.current.postMessage({
        type: 'PLAY',
        payload: {
          color: currentPlayer,
          vertex: toGtpVertex(x, y, boardSize)
        }
      });
    }

    setHistory([...history, board]);
    setBoard(newBoard);
    setCaptured(prev => ({
      ...prev,
      [currentPlayer]: prev[currentPlayer] + totalCaptured
    }));

    if (totalCaptured > 0) {
      const captureAlert = document.createElement('div');
      captureAlert.className = `fixed top-1/3 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-xl z-50 font-bold text-xl pointer-events-none animate-bounce border-4 ${level >= 7 ? 'bg-[#5d2e0d] text-white border-[#3a1d08]' : 'bg-white text-red-500 border-red-100'}`;
      captureAlert.innerText = `${totalCaptured}개 따냄!`;
      document.body.appendChild(captureAlert);
      setTimeout(() => {
        captureAlert.classList.add('opacity-0', 'transition-opacity', 'duration-500');
        setTimeout(() => document.body.removeChild(captureAlert), 500);
      }, 1000);
    }

    setLastMove({ x, y });
    setCurrentPlayer(opponent);
  };

  // AI 수 트리거
  useEffect(() => {
    if (gameMode === 'pve' && currentPlayer === 'white' && !showScore && engineReady) {
      setAiThinking(true);
      const timer = setTimeout(() => {
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'GENMOVE',
            payload: { aiColor: 'white' }
          });
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [currentPlayer, gameMode, showScore, engineReady]);

  const handlePass = (isAiMove = false) => {
    setCurrentPlayer(currentPlayer === 'black' ? 'white' : 'black');
    setLastMove(null);

    if (workerRef.current && !isAiMove) {
      workerRef.current.postMessage({
        type: 'PLAY',
        payload: {
          color: currentPlayer,
          vertex: 'pass'
        }
      });
    }

    const alertEl = document.createElement('div');
    alertEl.className = `fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-8 py-4 rounded-full shadow-2xl z-50 font-bold text-2xl pointer-events-none animate-bounce border-4 ${level >= 7 ? 'bg-[#5d2e0d] text-white border-[#3a1d08]' : 'bg-white text-[#8b4513] border-[#e6d598]'}`;
    alertEl.innerText = `${currentPlayer === 'black' ? '흑' : '백'} 한 수 쉬기`;
    document.body.appendChild(alertEl);
    
    setTimeout(() => {
      alertEl.classList.add('opacity-0', 'transition-opacity', 'duration-500');
      setTimeout(() => document.body.removeChild(alertEl), 500);
    }, 1000);
  };

  const handlePlaceStoneRef = React.useRef(handlePlaceStone);
  const handlePassRef = React.useRef(handlePass);

  useEffect(() => {
    handlePlaceStoneRef.current = handlePlaceStone;
    handlePassRef.current = handlePass;
  });

  const handleFinish = () => {
    const result = calculateTerritory(board, boardSize);
    setScores({
      black: result.black + captured.black,
      white: result.white + captured.white + 6.5,
      territory: result.territory
    });
    setShowScore(true);
    
    if (result.black + captured.black > result.white + captured.white + 6.5) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: level >= 7 ? ['#000000', '#ffffff', '#5d2e0d'] : ['#8b4513', '#e6d598', '#ffffff', '#000000']
      });
    }
  };

  const isStarPoint = (x: number, y: number) => {
    if (boardSize === 9) return ((x === 2 || x === 6) && (y === 2 || y === 6)) || (x === 4 && y === 4);
    if (boardSize === 13) return ((x === 3 || x === 9) && (y === 3 || y === 9)) || (x === 6 && y === 6);
    if (boardSize === 19) {
      const coords = [3, 9, 15];
      return coords.includes(x) && coords.includes(y);
    }
    return false;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-[#fffaf0]">
      <svg className="hidden">
        <defs>
          <filter id="goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <header className="mb-8 text-center">
        <motion.h1 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`font-display font-bold mb-2 drop-shadow-sm ${level >= 7 ? 'text-4xl text-[#5d2e0d]' : 'text-5xl text-[#8b4513]'}`}
        >
          {level >= 7 ? '정석 바둑 대국실 🏛️' : '꼬마 바둑 교실 🎨'}
        </motion.h1>
        <p className="text-[#a0522d] font-medium">
          {level >= 7 ? '진정한 바둑 기사의 정신으로 대국에 임하세요.' : '말랑말랑 바둑돌과 함께하는 즐거운 바둑 시간!'}
        </p>
      </header>

      <main className="flex flex-col lg:flex-row gap-8 items-center lg:items-start max-w-7xl w-full">
        <div className="flex flex-col gap-4 w-full lg:w-72">
          {/* 대전 모드 */}
          <div className={`bg-white p-6 rounded-3xl shadow-xl border-4 ${level >= 7 ? 'border-[#5d2e0d]' : 'border-[#e6d598]'}`}>
            <div className={`flex items-center gap-2 mb-4 font-bold text-xl ${level >= 7 ? 'text-[#5d2e0d]' : 'text-[#8b4513]'}`}>
              <Monitor size={24} />
              <span>대전 모드</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setGameMode('pvp')} className={`py-2 px-1 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1 ${gameMode === 'pvp' ? (level >= 7 ? 'bg-[#5d2e0d] text-white' : 'bg-[#8b4513] text-white') : 'bg-zinc-100 text-[#a0522d]'}`}>
                <Users size={16} /> 1:1
              </button>
              <button onClick={() => setGameMode('pve')} className={`py-2 px-1 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1 ${gameMode === 'pve' ? (level >= 7 ? 'bg-[#5d2e0d] text-white' : 'bg-[#8b4513] text-white') : 'bg-zinc-100 text-[#a0522d]'}`}>
                <Monitor size={16} /> 1:Com
              </button>
            </div>
          </div>

          {/* 바둑판 크기 */}
          <div className={`bg-white p-6 rounded-3xl shadow-xl border-4 ${level >= 7 ? 'border-[#5d2e0d]' : 'border-[#e6d598]'}`}>
            <div className={`flex items-center gap-2 mb-4 font-bold text-xl ${level >= 7 ? 'text-[#5d2e0d]' : 'text-[#8b4513]'}`}>
              <Layers size={24} />
              <span>바둑판 크기</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[9, 13, 19].map((size) => (
                <button key={size} onClick={() => setBoardSize(size as 9 | 13 | 19)} className={`py-2 px-1 rounded-xl font-bold text-sm transition-all ${boardSize === size ? (level >= 7 ? 'bg-[#5d2e0d] text-white' : 'bg-[#8b4513] text-white') : 'bg-zinc-100 text-[#a0522d]'}`}>
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>

          {/* 난이도 (단) */}
          <div className={`bg-white p-6 rounded-3xl shadow-xl border-4 ${level >= 7 ? 'border-[#5d2e0d]' : 'border-[#e6d598]'}`}>
            <div className={`flex items-center gap-2 mb-4 font-bold text-xl ${level >= 7 ? 'text-[#5d2e0d]' : 'text-[#8b4513]'}`}>
              <Star size={24} />
              <span>난이도 (단)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(LEVEL_CONFIG) as unknown as Level[]).map((lvl) => (
                <button key={lvl} onClick={() => setLevel(Number(lvl) as Level)} className={`py-2 px-1 rounded-xl font-bold text-sm transition-all ${level === Number(lvl) ? (level >= 7 ? 'bg-[#5d2e0d] text-white' : 'bg-[#8b4513] text-white') : 'bg-zinc-100 text-[#a0522d]'}`}>
                  {LEVEL_CONFIG[Number(lvl) as Level].label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-center text-[#a0522d] opacity-70">{LEVEL_CONFIG[level].description}</p>
          </div>
        </div>

        <div className="relative group flex-1 flex justify-center">
          {/* 엔진 로딩 오버레이 */}
          <AnimatePresence>
            {gameMode === 'pve' && !engineReady && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
              >
                <div className="absolute inset-0 bg-black/10 backdrop-blur-sm rounded-xl" />
                <div className={`relative flex flex-col items-center gap-4 p-8 rounded-3xl shadow-2xl border-4 ${level >= 7 ? 'bg-[#5d2e0d] text-white border-[#3a1d08]' : 'bg-white border-[#e6d598]'}`}>
                  <Loader2 className={`animate-spin ${level >= 7 ? 'text-yellow-400' : 'text-[#8b4513]'}`} size={48} />
                  <div className="text-center">
                    <p className={`font-display font-bold text-xl ${level >= 7 ? 'text-yellow-400' : 'text-[#8b4513]'}`}>
                      GNU Go 엔진 로딩 중...
                    </p>
                    <p className={`text-sm mt-1 ${level >= 7 ? 'text-white/70' : 'text-[#a0522d]/70'}`}>
                      {LEVEL_CONFIG[level].label} 난이도로 준비합니다
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI 생각 중 표시 */}
          <AnimatePresence>
            {aiThinking && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-2 left-1/2 -translate-x-1/2 z-40"
              >
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg border-2 ${level >= 7 ? 'bg-[#5d2e0d] text-white border-[#3a1d08]' : 'bg-white text-[#8b4513] border-[#e6d598]'}`}>
                  <Loader2 className="animate-spin" size={16} />
                  <span className="font-bold text-sm">
                    COM ({LEVEL_CONFIG[level].label}) 생각 중...
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`baduk-board rounded-xl shadow-2xl border-8 w-fit ${level >= 7 ? 'p-2 md:p-4 border-[#5d2e0d] bg-[#c49a6c] advanced' : 'p-3 md:p-6 border-[#8b4513] bg-[#f3e5ab]'}`}>
            <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`, width: level >= 7 ? 'min(90vw, 700px)' : 'min(85vw, 600px)', height: level >= 7 ? 'min(90vw, 700px)' : 'min(85vw, 600px)' }}>
              {board.map((row, y) => row.map((cell, x) => (
                <div key={`${x}-${y}`} onClick={() => handlePlaceStone(x, y)} className={`relative group/cell ${aiThinking ? 'cursor-wait' : 'cursor-pointer'}`}>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className={`w-full ${level >= 7 ? 'h-[1px] bg-[#5d2e0d] opacity-60' : 'h-[1px] md:h-[2px] bg-[#8b4513] opacity-40'}`} />
                    <div className={`h-full absolute ${level >= 7 ? 'w-[1px] bg-[#5d2e0d] opacity-60' : 'w-[1px] md:w-[2px] bg-[#8b4513] opacity-40'}`} />
                  </div>
                  {isStarPoint(x, y) && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`rounded-full bg-[#5d2e0d] ${level >= 7 ? 'w-1 h-1 md:w-1.5 md:h-1.5 opacity-80' : 'w-1.5 h-1.5 md:w-2 md:h-2 opacity-60'}`} />
                    </div>
                  )}
                  {showScore && scores.territory[y][x] && (
                    <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 0.6 }} className={`absolute inset-0 rounded-lg z-10 ${scores.territory[y][x] === 'black' ? 'glass-black' : 'glass-white'} ${level >= 7 ? 'scale-40 opacity-80' : 'scale-50'}`} />
                  )}
                  <div className="absolute inset-0 p-0 flex items-center justify-center z-20">
                    <AnimatePresence mode="popLayout">
                      {cell && (
                        <motion.div key={`${x}-${y}-${cell}`} initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0, opacity: 0, rotate: 45 }} transition={{ type: "spring", stiffness: 400, damping: 17 }} className="w-full h-full">
                          <Stone color={cell} isNew={lastMove?.x === x && lastMove?.y === y} variant={LEVEL_CONFIG[level].variant} connections={level < 4 ? { top: y > 0 && board[y - 1][x] === cell, bottom: y < boardSize - 1 && board[y + 1][x] === cell, left: x > 0 && board[y][x - 1] === cell, right: x < boardSize - 1 && board[y][x + 1] === cell } : undefined} diagonalConnections={level < 4 ? { topLeft: x > 0 && y > 0 && board[y - 1][x - 1] === cell && board[y - 1][x] !== cell && board[y][x - 1] !== cell, topRight: x < boardSize - 1 && y > 0 && board[y - 1][x + 1] === cell && board[y - 1][x] !== cell && board[y][x + 1] !== cell, bottomLeft: x > 0 && y < boardSize - 1 && board[y + 1][x - 1] === cell && board[y + 1][x] !== cell && board[y][x - 1] !== cell, bottomRight: x < boardSize - 1 && y < boardSize - 1 && board[y + 1][x + 1] === cell && board[y + 1][x] !== cell && board[y][x + 1] !== cell } : undefined} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {!cell && !showScore && !aiThinking && (
                      <div className={`w-full h-full rounded-full opacity-0 group-hover/cell:opacity-20 transition-opacity ${currentPlayer === 'black' ? 'bg-black' : 'bg-white'} ${level >= 7 ? 'scale-70' : 'scale-80'}`} />
                    )}
                  </div>
                </div>
              )))}
            </div>
          </div>
          {lastMove && !showScore && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute pointer-events-none z-30" style={{ left: `calc(${(lastMove.x / boardSize) * 100}% + ${100 / boardSize / 2}%)`, top: `calc(${(lastMove.y / boardSize) * 100}% + ${100 / boardSize / 2}%)`, transform: 'translate(-50%, -50%)' }}>
              <div className={`rounded-full shadow-lg ${level >= 7 ? 'w-1 h-1 md:w-1.5 md:h-1.5 bg-red-600' : 'w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500'}`} />
            </motion.div>
          )}

          {/* 결과 오버레이 */}
          <AnimatePresence>
            {showScore && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-50 p-4"
              >
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-xl" onClick={() => setShowScore(false)} />
                <motion.div 
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  className={`relative p-8 rounded-3xl shadow-2xl border-4 min-w-[300px] ${level >= 7 ? 'bg-[#5d2e0d] text-white border-[#3a1d08]' : 'bg-white border-yellow-400'}`}
                >
                  <h3 className={`text-3xl font-display font-bold mb-6 flex items-center justify-center gap-2 ${level >= 7 ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    <Star className="fill-yellow-400 text-yellow-400" /> 대국 결과
                  </h3>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">흑돌:</span>
                      <span className="text-2xl font-mono">{scores.black}집</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-bold">백돌{gameMode === 'pve' ? ' (COM)' : ''}:</span>
                      <span className="text-2xl font-mono">{scores.white}집</span>
                    </div>
                    {gameMode === 'pve' && (
                      <div className={`text-xs text-center py-1 ${level >= 7 ? 'text-white/60' : 'text-zinc-400'}`}>
                        난이도: {LEVEL_CONFIG[level].label} ({LEVEL_CONFIG[level].description})
                      </div>
                    )}
                    <div className={`pt-4 border-t-2 border-dashed text-center ${level >= 7 ? 'border-[#3a1d08]' : 'border-zinc-100'}`}>
                      <span className={`text-3xl font-display font-bold ${level >= 7 ? 'text-yellow-400' : 'text-[#8b4513]'}`}>
                        {scores.black > scores.white ? '흑 승리' : '백 승리'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowScore(false)}
                    className={`w-full py-3 rounded-xl font-bold transition-all active:scale-95 ${level >= 7 ? 'bg-yellow-400 text-[#5d2e0d] hover:bg-yellow-300' : 'bg-[#8b4513] text-white hover:bg-[#a0522d]'}`}
                  >
                    확인
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-4 w-full lg:w-72">
          {/* 대국 현황 */}
          <div className={`bg-white p-6 rounded-3xl shadow-xl border-4 ${level >= 7 ? 'border-[#5d2e0d]' : 'border-[#e6d598]'}`}>
            <div className={`flex items-center gap-2 mb-4 font-bold text-xl ${level >= 7 ? 'text-[#5d2e0d]' : 'text-[#8b4513]'}`}>
              <Users size={24} />
              <span>대국 현황</span>
            </div>
            <div className="space-y-4">
              <div className={`flex items-center justify-between p-3 rounded-2xl transition-all ${currentPlayer === 'black' ? 'bg-zinc-100 scale-105 border-2 border-zinc-300' : 'opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900" />
                  <span className="font-bold">흑돌</span>
                </div>
                <span className="font-mono bg-zinc-200 px-2 py-1 rounded-lg text-sm">{captured.black} 잡음</span>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-2xl transition-all ${currentPlayer === 'white' ? 'bg-zinc-100 scale-105 border-2 border-zinc-300' : 'opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border-2 border-zinc-200" />
                  <div className="flex flex-col">
                    <span className="font-bold">{gameMode === 'pve' ? 'COM' : '백돌'}</span>
                    {gameMode === 'pve' && (
                      <span className="text-xs text-[#a0522d]/60">{LEVEL_CONFIG[level].label}</span>
                    )}
                  </div>
                </div>
                <span className="font-mono bg-zinc-200 px-2 py-1 rounded-lg text-sm">{captured.white} 잡음</span>
              </div>
            </div>
          </div>

          {/* 엔진 상태 표시 (PvE 모드) */}
          {gameMode === 'pve' && (
            <div className={`bg-white p-4 rounded-3xl shadow-xl border-4 ${level >= 7 ? 'border-[#5d2e0d]' : 'border-[#e6d598]'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${engineReady ? 'bg-green-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                <div className="flex flex-col">
                  <span className={`font-bold text-sm ${level >= 7 ? 'text-[#5d2e0d]' : 'text-[#8b4513]'}`}>
                    GNU Go 엔진
                  </span>
                  <span className="text-xs text-[#a0522d]/60">
                    {engineReady ? `준비 완료 · ${LEVEL_CONFIG[level].label} 난이도` : '로딩 중...'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4">
            <button onClick={handlePass} disabled={showScore || aiThinking} className={`flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 font-bold py-4 px-6 rounded-3xl shadow-lg border-4 transition-all active:scale-95 disabled:opacity-50 ${level >= 7 ? 'text-[#5d2e0d] border-[#5d2e0d]' : 'text-[#8b4513] border-[#e6d598]'}`}>
              <SkipForward size={24} /> 한 수 쉬기
            </button>
            <button onClick={handleFinish} disabled={showScore || aiThinking} className={`flex items-center justify-center gap-2 font-bold py-4 px-6 rounded-3xl shadow-lg border-4 transition-all active:scale-95 disabled:opacity-50 ${level >= 7 ? 'bg-[#5d2e0d] text-white border-[#3a1d08]' : 'bg-[#8b4513] text-white border-[#5d2e0d]'}`}>
              <Trophy size={24} /> 계가 하기
            </button>
            <button onClick={handleReset} className={`flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-red-500 font-bold py-4 px-6 rounded-3xl shadow-lg border-4 transition-all active:scale-95 ${level >= 7 ? 'border-red-200' : 'border-red-100'}`}>
              <RotateCcw size={24} /> 다시 시작
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
