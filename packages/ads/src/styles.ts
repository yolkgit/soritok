// 광고 컴포넌트가 쓰는 반응형/인쇄/애니메이션 CSS 를 1회만 주입합니다.
// (inline 스타일로는 미디어쿼리/keyframes 를 표현할 수 없으므로 클래스로 처리)
const STYLE_ID = 'soritok-ads-styles'

const CSS = `
.stk-ad-sidebar { display: none; }
.stk-ad-mobile { display: flex; }
@media (min-width: 1280px) {
  .stk-ad-sidebar { display: flex; }
  .stk-ad-mobile { display: none; }
}
@media print {
  .stk-ad-sidebar, .stk-ad-mobile, .stk-ad-interstitial { display: none !important; }
}
@keyframes stk-fade-in { from { opacity: 0; } to { opacity: 1; } }
`

export function ensureAdStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = CSS
  document.head.appendChild(el)
}
