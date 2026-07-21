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

const WP_API =
  'https://slow7.soritok.com/wp-json/wp/v2/posts?per_page=8&status=publish&_fields=title,excerpt,link'

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

async function fetchPosts(): Promise<WpPost[]> {
  try {
    const res = await fetch(WP_API)
    if (!res.ok) return []
    return (await res.json()) as WpPost[]
  } catch {
    return []
  }
}

function buildHtml(posts: WpPost[]): string {
  if (!posts.length) return ''
  const items = posts
    .map((p) => {
      const title = esc(stripTags(p.title.rendered))
      const summary = esc(stripTags(p.excerpt.rendered)).slice(0, 140)
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
      <p class="s7-latest__desc">7분 페이스 슬로우조깅으로 건강하게 달리는 법 — 자세·호흡·다이어트·초보 플랜까지.</p>
${items}
      <p class="s7-latest__more"><a href="https://slow7.soritok.com">슬로우7 블로그 전체 글 보기 →</a></p>
    </div>
  </section>
  <!-- BLOG_POSTS_END -->`
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
  </style>`

export function injectBlogPosts(): Plugin {
  let html = ''
  return {
    name: 'inject-blog-posts',
    apply: 'build',
    async buildStart() {
      const posts = await fetchPosts()
      html = buildHtml(posts)
      if (html) {
        this.info(`슬로우7 블로그 글 ${posts.length}개 주입`)
      } else {
        this.warn('블로그 글을 못 가져옴 — 정적 블록 없이 빌드')
      }
    },
    transformIndexHtml(original) {
      if (!html) return original
      // </body> 직전에 스타일 + 콘텐츠 삽입
      return original.replace('</body>', `${STYLE}\n${html}\n</body>`)
    },
  }
}
