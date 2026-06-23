import type { GameDef } from './types'
import Game2048 from './games/Game2048'
import SnakeGame from './games/SnakeGame'
import TetrisGame from './games/TetrisGame'
import FlappyGame from './games/FlappyGame'
import WhackAMole from './games/WhackAMole'
import BreakoutGame from './games/BreakoutGame'
import StackGame from './games/StackGame'
import DinoGame from './games/DinoGame'
import SimonGame from './games/SimonGame'

/** 새 게임 추가 = 이 배열에 항목 하나 추가 */
export const GAMES: GameDef[] = [
  {
    id: '2048',
    title: '2048',
    emoji: '🔢',
    color: '#edc22e',
    desc: '같은 숫자를 합쳐 2048을 만들기',
    scoreLabel: '점수',
    Component: Game2048,
  },
  {
    id: 'snake',
    title: '스네이크',
    emoji: '🐍',
    color: '#5be07c',
    desc: '먹이를 먹고 길어지기',
    scoreLabel: '점수',
    Component: SnakeGame,
  },
  {
    id: 'tetris',
    title: '테트리스',
    emoji: '🧱',
    color: '#b061e0',
    desc: '블록을 쌓아 줄을 없애기',
    scoreLabel: '점수',
    Component: TetrisGame,
  },
  {
    id: 'flappy',
    title: '플래피버드',
    emoji: '🐤',
    color: '#f5d442',
    desc: '탭으로 날아 파이프 통과하기',
    scoreLabel: '통과',
    Component: FlappyGame,
  },
  {
    id: 'mole',
    title: '두더지잡기',
    emoji: '🐹',
    color: '#f5a142',
    desc: '30초 동안 두더지 많이 잡기',
    scoreLabel: '잡은 수',
    Component: WhackAMole,
  },
  {
    id: 'breakout',
    title: '벽돌깨기',
    emoji: '🏓',
    color: '#36cfe6',
    desc: '패들로 공을 튕겨 벽돌 깨기',
    scoreLabel: '점수',
    Component: BreakoutGame,
  },
  {
    id: 'stack',
    title: '스택',
    emoji: '🏗️',
    color: '#54e07c',
    desc: '블록을 정확히 쌓아 올리기',
    scoreLabel: '층',
    Component: StackGame,
  },
  {
    id: 'dino',
    title: '디노런',
    emoji: '🦖',
    color: '#9bd64a',
    desc: '점프로 장애물을 피해 멀리 달리기',
    scoreLabel: '점수',
    Component: DinoGame,
  },
  {
    id: 'simon',
    title: '기억력',
    emoji: '🧠',
    color: '#f7d23e',
    desc: '색깔 순서를 기억해 따라 누르기',
    scoreLabel: '단계',
    Component: SimonGame,
  },
]

export const getGame = (id: string): GameDef | undefined => GAMES.find((g) => g.id === id)
