import type { Service } from '../types'
import WeeklyBoard from './WeeklyBoard'
import Bookcase from './Bookcase'
import GoBoard from './GoBoard'
import Aquarium from './Aquarium'
import GameConsole from './GameConsole'
import StickyNote from './StickyNote'
import Mirror from './Mirror'

interface Props {
  services: Service[]
  onPick: (service: Service) => void
}

/** 책상에 올라가는 사물들을 kind 에 따라 그립니다. */
function renderDeskItem(service: Service, onPick: (s: Service) => void) {
  switch (service.kind) {
    case 'goban':
      return <GoBoard key={service.id} service={service} onPick={onPick} />
    case 'aquarium':
      return <Aquarium key={service.id} service={service} onPick={onPick} />
    case 'arcade':
      return <GameConsole key={service.id} service={service} onPick={onPick} />
    case 'mirror':
      return <Mirror key={service.id} service={service} onPick={onPick} />
    case 'note':
    default:
      return <StickyNote key={service.id} service={service} onPick={onPick} />
  }
}

const DESK_KINDS: Service['kind'][] = ['goban', 'aquarium', 'arcade', 'mirror', 'note']

export default function Scene({ services, onPick }: Props) {
  const boards = services.filter((s) => s.kind === 'board')
  const books = services.filter((s) => s.kind === 'book')
  const deskItems = services.filter((s) => DESK_KINDS.includes(s.kind))

  return (
    <div className="stage">
      {/* 벽 — 보드판 + 교육 책장 */}
      <div className="wall-zone">
        {boards.map((s) => (
          <WeeklyBoard key={s.id} service={s} onPick={onPick} />
        ))}
        <Bookcase books={books} onPick={onPick} />
      </div>

      {/* 원근감 있는 책상 — 사물들은 한 줄로 책상 위에 놓임 */}
      <div className="desk">
        <div className="desk__stage">
          <div className="desk__top" aria-hidden />
          <div className="desk__items">
            <PencilCup />
            {deskItems.map((s) => renderDeskItem(s, onPick))}
            <Mug />
          </div>
        </div>
        <div className="desk__front" aria-hidden />
      </div>
    </div>
  )
}

/* ---- 책상 소품(장식, 클릭 없음) ---- */
function PencilCup() {
  return (
    <div className="prop pencils" aria-hidden>
      <span className="pencils__pen pencils__pen--1" />
      <span className="pencils__pen pencils__pen--2" />
      <span className="pencils__pen pencils__pen--3" />
      <span className="pencils__cup" />
    </div>
  )
}

function Mug() {
  return (
    <div className="prop mug" aria-hidden>
      <span className="mug__handle" />
      <span className="mug__body">
        <span className="mug__coffee" />
        <span className="mug__steam" />
      </span>
    </div>
  )
}
