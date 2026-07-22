/**
 * 빌드 시점에 슬로우7 블로그 최신 글을 워드프레스 REST에서 가져와
 * index.html <body> 안에 '크롤러가 읽을 수 있는' 정적 HTML로 주입한다.
 *
 * 목적: 소리톡 허브(SPA)는 JS 로딩 전엔 콘텐츠가 없어 애드센스/구글 크롤러가
 *       "콘텐츠 없는 화면"으로 판정한다. 이 블록을 index.html에 직접 박아
 *       루트 도메인(soritok.com)이 '읽을거리 있는 사이트'가 되게 한다.
 *
 * SPA가 마운트되면 #root 를 채우므로, 이 정적 블록은 noscript 스타일로
 * 화면 밖에 두거나 하단 footer 영역에 자연스럽게 노출한다.
 */
import type { Plugin } from 'vite'
import { services } from '../src/data/services'

const WP_API =
  'https://slow7.soritok.com/wp-json/wp/v2/posts?per_page=15&status=publish&_fields=title,excerpt,link'

interface WpPost {
  link: string
  title: { rendered: string }
  excerpt: { rendered: string }
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&hellip;/g, '…')
    .replace(/&amp;/g, '&')
    .replace(/&#8230;/g, '…')
    .replace(/\s+/g, ' ')
    .trim()
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 워드프레스에서 최신 글을 가져온다. 성공하면 캐시 파일에 저장하고,
 * 실패하면(도커 빌드 등 네트워크 불가 환경) 캐시를 사용한다.
 * → 어떤 환경에서 빌드해도 루트에 항상 블로그 콘텐츠가 들어가도록 보장.
 */
const CACHE_PATH = new URL('./posts.cache.json', import.meta.url)

async function fetchPosts(): Promise<WpPost[]> {
  const { readFileSync, writeFileSync } = await import('node:fs')
  try {
    const res = await fetch(WP_API, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const posts = (await res.json()) as WpPost[]
    if (posts.length) {
      try {
        writeFileSync(CACHE_PATH, JSON.stringify(posts, null, 2), 'utf-8')
      } catch {
        /* 캐시 저장 실패는 무시 */
      }
      return posts
    }
    throw new Error('empty')
  } catch {
    // 네트워크 불가 → 캐시 사용
    try {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf-8')) as WpPost[]
    } catch {
      return []
    }
  }
}

function buildHtml(posts: WpPost[]): string {
  if (!posts.length) return ''
  const items = posts
    .map((p) => {
      const title = esc(stripTags(p.title.rendered))
      const summary = esc(stripTags(p.excerpt.rendered)).slice(0, 220)
      return `      <article class="s7-post">
        <h3 class="s7-post__title"><a href="${esc(p.link)}">${title}</a></h3>
        <p class="s7-post__excerpt">${summary}</p>
      </article>`
    })
    .join('\n')

  return `
  <!-- BLOG_POSTS_START (빌드 시 자동 생성 · 크롤러용 정적 콘텐츠) -->
  <section class="s7-latest" aria-label="슬로우7 블로그 최신 글">
    <div class="s7-latest__inner">
      <h2 class="s7-latest__head">🏃 건강&슬로우러닝 · 슬로우7 최신 글</h2>
      <p class="s7-latest__desc">7분 페이스 슬로우조깅으로 건강하게 달리는 법 — 자세·호흡·다이어트·초보 플랜까지, 매주 새 글이 올라옵니다.</p>
${items}
      <p class="s7-latest__more"><a href="https://slow7.soritok.com">슬로우7 블로그 전체 글 보기 →</a></p>
    </div>
  </section>
  <!-- BLOG_POSTS_END -->`
}

/** 소리톡 서비스 소개를 정적 HTML로 (크롤러가 '다양한 콘텐츠 허브'로 인식하게) */
function buildServicesHtml(): string {
  const active = services.filter(
    (s) => s.status === 'active' && s.id !== 'slow7',
  )
  if (!active.length) return ''
  const items = active
    .map((s) => {
      const href = esc(s.url)
      const title = `${esc(s.emoji)} ${esc(s.title)}`
      // 실제 링크를 걸어 크롤러가 하위 페이지를 발견하게 한다
      const titleHtml =
        s.url && s.url !== '#'
          ? `<a href="${href}">${title}</a>`
          : title
      return `      <article class="s7-svc">
        <h3 class="s7-svc__title">${titleHtml}</h3>
        <p class="s7-svc__desc">${esc(s.description)}</p>
      </article>`
    })
    .join('\n')

  return `
  <!-- SERVICES_START -->
  <section class="s7-svcs" aria-label="소리톡 서비스 소개">
    <div class="s7-latest__inner">
      <h2 class="s7-latest__head">📚 소리톡 서비스 안내</h2>
      <p class="s7-latest__desc">아이와 가족을 위한 학습·놀이 서비스를 책상 위에서 골라 쓰세요.</p>
${items}
      <nav class="s7-foot">
        <a href="https://slow7.soritok.com/about/">소개</a>
        <a href="https://slow7.soritok.com/privacy-policy/">개인정보처리방침</a>
        <a href="https://slow7.soritok.com/contact/">연락처</a>
      </nav>
    </div>
  </section>
  <!-- SERVICES_END -->`
}

const STYLE = `
  <style>
    .s7-latest{background:#faf7f0;border-top:1px solid #ece4d3;margin-top:48px;padding:36px 16px 48px;}
    .s7-latest__inner{max-width:760px;margin:0 auto;}
    .s7-latest__head{font-size:1.15rem;font-weight:800;color:#3a2d1a;margin:0 0 6px;}
    .s7-latest__desc{color:#6b5d45;font-size:.9rem;margin:0 0 20px;}
    .s7-post{padding:14px 0;border-bottom:1px solid #ece4d3;}
    .s7-post__title{font-size:1rem;font-weight:700;margin:0 0 4px;}
    .s7-post__title a{color:#2e5d3d;text-decoration:none;}
    .s7-post__title a:hover{text-decoration:underline;}
    .s7-post__excerpt{color:#6b5d45;font-size:.88rem;line-height:1.5;margin:0;}
    .s7-latest__more{margin-top:18px;}
    .s7-latest__more a{color:#e8743b;font-weight:700;text-decoration:none;}
    .s7-svcs{background:#f4f0e6;border-top:1px solid #ece4d3;padding:36px 16px 48px;}
    .s7-svc{padding:12px 0;border-bottom:1px solid #e5dcc7;}
    .s7-svc__title{font-size:1rem;font-weight:700;color:#3a2d1a;margin:0 0 4px;}
    .s7-svc__title a{color:#3a2d1a;text-decoration:none;}
    .s7-svc__title a:hover{text-decoration:underline;}
    .s7-svc__desc{color:#6b5d45;font-size:.88rem;line-height:1.5;margin:0;}
    .s7-foot{margin-top:24px;display:flex;flex-wrap:wrap;gap:16px;}
    .s7-foot a{color:#6b5d45;font-size:.85rem;text-decoration:underline;}
  </style>`

export function injectBlogPosts(): Plugin {
  let html = ''
  return {
    name: 'inject-blog-posts',
    apply: 'build',
    async buildStart() {
      const posts = await fetchPosts()
      const blogHtml = buildHtml(posts)
      const svcHtml = buildServicesHtml()
      html = blogHtml + svcHtml
      if (blogHtml) {
        this.info(`슬로우7 블로그 글 ${posts.length}개 + 서비스 소개 주입`)
      } else {
        this.warn('블로그 글을 못 가져옴 — 서비스 소개만 주입')
        html = svcHtml
      }
    },
    transformIndexHtml(original) {
      if (!html) return original
      // </body> 직전에 스타일 + 콘텐츠 삽입
      return original.replace('</body>', `${STYLE}\n${html}\n</body>`)
    },
  }
}
