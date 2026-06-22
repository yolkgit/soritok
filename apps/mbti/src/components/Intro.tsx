interface Props {
  onStart: () => void
  total: number
}

export default function Intro({ onStart, total }: Props) {
  return (
    <div className="intro">
      <div className="badge">소리톡 · NEW 64유형</div>
      <h1>
        나는 64유형 중<br />어떤 사람일까?
      </h1>
      <p className="lead">
        기존 16유형 MBTI에 <b>확신형/민감형(A·T)</b>과{' '}
        <b>관계 방식(광역형·심층형)</b> 축을 더한 6축 성격 테스트.
      </p>
      <ul className="howto">
        <li>📝 총 {total}문항, 약 3분 소요</li>
        <li>⚖️ 둘 중 더 가까운 쪽을 직관적으로 선택</li>
        <li>🪞 결과에선 나를 비추는 거울처럼 성향을 풀어드려요</li>
      </ul>
      <button className="btn primary" onClick={onStart}>
        테스트 시작하기
      </button>
    </div>
  )
}
