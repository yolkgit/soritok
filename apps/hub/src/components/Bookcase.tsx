import type { Service } from '../types'
import Spine from './Spine'

interface Props {
  books: Service[]
  onPick: (service: Service) => void
}

/** 과목별 교육 책이 꽂히는 책장 (벽에 세워둔 가구) */
export default function Bookcase({ books, onPick }: Props) {
  if (books.length === 0) return null

  return (
    <div className="bookcase">
      <div className="bookcase__cap" aria-hidden />
      <div className="bookcase__shelf">
        <div className="bookcase__books">
          {books.map((b) => (
            <Spine key={b.id} service={b} onPick={onPick} />
          ))}
        </div>
        <div className="bookcase__board" aria-hidden />
      </div>
      <span className="object-label" style={{ ['--c' as string]: '#7a4f27' }}>
        교육 책장
      </span>
    </div>
  )
}
