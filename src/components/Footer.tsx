interface Props {
  count: number
}

export default function Footer({ count }: Props) {
  return (
    <footer className="footer">
      <span className="footer__badge">현재 {count}개의 서비스가 열려 있어요</span>
      <span className="footer__brand">© {new Date().getFullYear()} soritok.com</span>
    </footer>
  )
}
