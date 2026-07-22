/**
 * 소리톡 공용 SEO 콘텐츠 주입 플러그인.
 *
 * 문제: 모든 앱이 SPA(React)라 JS 실행 전 HTML에 콘텐츠가 없다.
 *       구글/애드센스 크롤러는 이를 "콘텐츠 없는 화면"으로 판정한다.
 * 해결: 빌드 시 각 페이지의 소개·설명·링크를 정적 HTML로 <body>에 주입한다.
 *       SPA가 마운트되면 #root 가 채워지고, 이 블록은 페이지 하단에 남아
 *       사용자에게도 서비스 안내로 기능한다.
 */
import type { Plugin } from 'vite'

export interface SeoSection {
  /** 소제목 (h3) */
  title: string
  /** 본문 설명 */
  body: string
}

export interface SeoContentOptions {
  /** 페이지 대제목 (h1 아님 — SPA와 충돌 방지 위해 h2) */
  heading: string
  /** 페이지 요약 한 줄 */
  intro: string
  /** 상세 섹션들 */
  sections: SeoSection[]
  /** 하단 링크 (다른 서비스/정책 등) */
  links?: { label: string; href: string }[]
}

export function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const STYLE = `
  <style>
    .stk-seo{background:#faf7f0;border-top:1px solid #ece4d3;margin-top:48px;padding:36px 16px 44px;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;}
    .stk-seo__inner{max-width:760px;margin:0 auto;}
    .stk-seo__head{font-size:1.15rem;font-weight:800;color:#3a2d1a;margin:0 0 6px;}
    .stk-seo__intro{color:#6b5d45;font-size:.92rem;line-height:1.6;margin:0 0 20px;}
    .stk-seo__sec{padding:14px 0;border-bottom:1px solid #ece4d3;}
    .stk-seo__sec h3{font-size:1rem;font-weight:700;color:#2e5d3d;margin:0 0 5px;}
    .stk-seo__sec p{color:#6b5d45;font-size:.9rem;line-height:1.65;margin:0;}
    .stk-seo__links{margin-top:20px;display:flex;flex-wrap:wrap;gap:14px;}
    .stk-seo__links a{color:#e8743b;font-weight:700;font-size:.9rem;text-decoration:none;}
    .stk-seo__links a:hover{text-decoration:underline;}
  </style>`

/** 공통 푸터 링크 — 모든 페이지에서 정책·소개 접근 가능하게 (애드센스 요구사항) */
export const COMMON_LINKS = [
  { label: '소리톡 홈', href: 'https://soritok.com' },
  { label: '슬로우7 블로그', href: 'https://slow7.soritok.com' },
  { label: '소개', href: 'https://slow7.soritok.com/about/' },
  { label: '개인정보처리방침', href: 'https://slow7.soritok.com/privacy-policy/' },
  { label: '연락처', href: 'https://slow7.soritok.com/contact/' },
]

export function renderSeoHtml(opts: SeoContentOptions): string {
  const sections = opts.sections
    .map(
      (s) => `      <div class="stk-seo__sec">
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.body)}</p>
      </div>`,
    )
    .join('\n')

  const links = (opts.links ?? COMMON_LINKS)
    .map((l) => `<a href="${esc(l.href)}">${esc(l.label)}</a>`)
    .join('\n        ')

  return `
  <!-- STK_SEO_START (빌드 시 자동 생성 · 크롤러용 정적 콘텐츠) -->
  <section class="stk-seo" aria-label="${esc(opts.heading)} 안내">
    <div class="stk-seo__inner">
      <h2 class="stk-seo__head">${esc(opts.heading)}</h2>
      <p class="stk-seo__intro">${esc(opts.intro)}</p>
${sections}
      <nav class="stk-seo__links">
        ${links}
      </nav>
    </div>
  </section>
  <!-- STK_SEO_END -->`
}

/** 정적 소개 콘텐츠를 index.html 에 주입하는 vite 플러그인 */
export function seoContent(opts: SeoContentOptions): Plugin {
  return {
    name: 'soritok-seo-content',
    apply: 'build',
    transformIndexHtml(original) {
      const html = renderSeoHtml(opts)
      return original.replace('</body>', `${STYLE}\n${html}\n</body>`)
    },
  }
}
