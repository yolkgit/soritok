import type { GameDef } from './types'
import Game2048 from './games/Game2048'
import SnakeGame from './games/SnakeGame'
import TetrisGame from './games/TetrisGame'
import FlappyGame from './games/FlappyGame'
import WhackAMole from './games/WhackAMole'

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
]

export const getGame = (id: string): GameDef | undefined => GAMES.find((g) => g.id === id)
