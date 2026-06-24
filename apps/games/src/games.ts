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
import JumpGame from './games/JumpGame'
import CrossingGame from './games/CrossingGame'
import BubbleGame from './games/BubbleGame'
import BlockPuzzleGame from './games/BlockPuzzleGame'
import MemoryGame from './games/MemoryGame'
import MineGame from './games/MineGame'
import PongGame from './games/PongGame'
import TypingGame from './games/TypingGame'
import LinkGame from './games/LinkGame'
import PinballGame from './games/PinballGame'
import SuikaGame from './games/SuikaGame'
import SlidePuzzleGame from './games/SlidePuzzleGame'
import SchulteGame from './games/SchulteGame'
import OddColorGame from './games/OddColorGame'
import NumberDropGame from './games/NumberDropGame'
import MazeGame from './games/MazeGame'
import RhythmGame from './games/RhythmGame'

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
  {
    id: 'jump',
    title: '점프',
    emoji: '🪜',
    color: '#f7d23e',
    desc: '발판을 밟고 계속 위로 올라가기',
    scoreLabel: '높이',
    Component: JumpGame,
  },
  {
    id: 'crossing',
    title: '길건너기',
    emoji: '🚗',
    color: '#9bd64a',
    desc: '차를 피해 길을 건너 전진하기',
    scoreLabel: '전진',
    Component: CrossingGame,
  },
  {
    id: 'bubble',
    title: '버블슈터',
    emoji: '🫧',
    color: '#36cfe6',
    desc: '같은 색 3개 이상을 맞춰 터뜨리기',
    scoreLabel: '점수',
    Component: BubbleGame,
  },
  {
    id: 'blockpuzzle',
    title: '블록퍼즐',
    emoji: '🧩',
    color: '#c069f0',
    desc: '조각을 놓아 줄·열을 채워 없애기',
    scoreLabel: '점수',
    Component: BlockPuzzleGame,
  },
  {
    id: 'memory',
    title: '카드짝맞추기',
    emoji: '🃏',
    color: '#5b8cf0',
    desc: '50초 안에 같은 그림 짝 맞추기',
    scoreLabel: '점수',
    Component: MemoryGame,
  },
  {
    id: 'mine',
    title: '지뢰찾기',
    emoji: '💣',
    color: '#ff6b6b',
    desc: '숫자 단서로 지뢰를 피해 칸 열기',
    scoreLabel: '점수',
    Component: MineGame,
  },
  {
    id: 'pong',
    title: '탁구',
    emoji: '🏓',
    color: '#54e07c',
    desc: '막대로 공을 받아쳐 컴퓨터 이기기',
    scoreLabel: '득점',
    Component: PongGame,
  },
  {
    id: 'typing',
    title: '타이핑',
    emoji: '⌨️',
    color: '#7c5cff',
    desc: '떨어지는 단어를 빠르게 입력하기',
    scoreLabel: '점수',
    Component: TypingGame,
  },
  {
    id: 'link',
    title: '사천성',
    emoji: '🀄',
    color: '#f5a347',
    desc: '길을 이어 같은 그림 짝 없애기',
    scoreLabel: '점수',
    Component: LinkGame,
  },
  {
    id: 'pinball',
    title: '핀볼',
    emoji: '🪅',
    color: '#f7d23e',
    desc: '플리퍼로 공을 띄워 범퍼 맞히기',
    scoreLabel: '점수',
    Component: PinballGame,
  },
  {
    id: 'suika',
    title: '수박게임',
    emoji: '🍉',
    color: '#54e07c',
    desc: '같은 과일을 합쳐 수박 만들기',
    scoreLabel: '점수',
    Component: SuikaGame,
  },
  {
    id: 'maze',
    title: '미로찾기',
    emoji: '🧭',
    color: '#36cfe6',
    desc: '미로를 빠져나가 출구에 도착하기',
    scoreLabel: '점수',
    Component: MazeGame,
  },
  {
    id: 'slide',
    title: '슬라이드퍼즐',
    emoji: '🔢',
    color: '#f5a347',
    desc: '숫자를 밀어 1~15 순서로 맞추기',
    scoreLabel: '점수',
    Component: SlidePuzzleGame,
  },
  {
    id: 'rhythm',
    title: '리듬게임',
    emoji: '🎵',
    color: '#ff6b6b',
    desc: '박자에 맞춰 노트를 타격하기',
    scoreLabel: '점수',
    Component: RhythmGame,
  },
  {
    id: 'numberdrop',
    title: '넘버드롭',
    emoji: '📲',
    color: '#edc22e',
    desc: '숫자를 떨어뜨려 합쳐 키우기',
    scoreLabel: '점수',
    Component: NumberDropGame,
  },
  {
    id: 'oddcolor',
    title: '다른색찾기',
    emoji: '🎨',
    color: '#c069f0',
    desc: '하나만 다른 색 칸을 빠르게 찾기',
    scoreLabel: '점수',
    Component: OddColorGame,
  },
  {
    id: 'schulte',
    title: '순서누르기',
    emoji: '🔟',
    color: '#5b8cf0',
    desc: '1부터 25까지 순서대로 빠르게 누르기',
    scoreLabel: '점수',
    Component: SchulteGame,
  },
]

export const getGame = (id: string): GameDef | undefined => GAMES.find((g) => g.id === id)
