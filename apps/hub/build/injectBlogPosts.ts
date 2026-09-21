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

/* ------------------------------------------------------------------
   관상어 도감 — 루트에 실제 콘텐츠(이미지+설명)를 노출
   ------------------------------------------------------------------
   애드센스 심사자는 루트에 착륙한다. 책상 씬만 보이면 "앱 포털"로 읽히고,
   도감 300여 종은 링크 한 번 더 들어가야 보인다. 대표 어종을 사진과 함께
   루트에 직접 놓아 "콘텐츠 사이트"임을 첫 화면 아래에서 바로 보이게 한다.
   블로그 글과 같은 방식(빌드 시 fetch, 실패 시 캐시)으로 가져온다.
   ------------------------------------------------------------------ */
const FISH_API = 'https://soritok.com/aqua/api/fish'
const FISH_CACHE_PATH = new URL('./fish.cache.json', import.meta.url)

interface FishCard {
  id: number
  categoryId: number
  name: string
  scientificName: string
  baseSpecies: string | null
  imageUrl: string
  pokedexEntry: string | null
}

async function fetchFish(): Promise<{ cards: FishCard[]; total: number }> {
  const { readFileSync, writeFileSync } = await import('node:fs')
  const pick = (all: FishCard[]) => {
    // 분류별 대표종: 담수(구피 등) 3 · 해수(클라운 등) 2 · 양서(아홀로틀) 1 — id 오름차순 = 초기 등록된 대표종
    const withImg = all.filter((c) => c.imageUrl && c.pokedexEntry)
    // 같은 원종(구피·구피·구피)이 몰리지 않게 원종당 1종만 — id 오름차순이라 각 원종의 첫 등록종
    const by = (cat: number, n: number) => {
      const seen = new Set<string>()
      return withImg
        .filter((c) => c.categoryId === cat)
        .sort((a, b) => a.id - b.id)
        .filter((c) => { const k = c.baseSpecies ?? c.name; if (seen.has(k)) return false; seen.add(k); return true })
        .slice(0, n)
    }
    const chosen = [...by(1, 3), ...by(3, 2), ...by(2, 1)]
    // 분류가 비어 부족하면 나머지에서 채운다
    for (const c of withImg) {
      if (chosen.length >= 6) break
      if (!chosen.includes(c)) chosen.push(c)
    }
    return chosen.slice(0, 6)
  }
  try {
    const res = await fetch(FISH_API, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { cards: FishCard[] }
    if (!data.cards?.length) throw new Error('empty')
    const slim = data.cards.map(({ id, categoryId, name, scientificName, baseSpecies, imageUrl, pokedexEntry }) => ({
      id, categoryId, name, scientificName, baseSpecies, imageUrl, pokedexEntry,
    }))
    try { writeFileSync(FISH_CACHE_PATH, JSON.stringify(slim), 'utf-8') } catch { /* 무시 */ }
    return { cards: pick(slim), total: slim.length }
  } catch {
    try {
      const cached = JSON.parse(readFileSync(FISH_CACHE_PATH, 'utf-8')) as FishCard[]
      return { cards: pick(cached), total: cached.length }
    } catch {
      return { cards: [], total: 0 }
    }
  }
}

function buildFishHtml(cards: FishCard[], total: number): string {
  if (!cards.length) return ''
  const items = cards
    .map((c) => {
      const summary = esc((c.pokedexEntry ?? '').replace(/\s+/g, ' ').trim()).slice(0, 90)
      return `      <a class="s7-fish" href="https://soritok.com/aqua/fish/${c.id}">
        <img class="s7-fish__img" src="${esc(c.imageUrl)}" alt="${esc(c.name)}" loading="lazy" width="160" height="160" />
        <span class="s7-fish__name">${esc(c.name)}</span>
        <span class="s7-fish__sci">${esc(c.scientificName)}</span>
        <span class="s7-fish__desc">${summary}</span>
      </a>`
    })
    .join('\n')

  return `
  <!-- FISH_START (빌드 시 자동 생성 · 도감 대표종) -->
  <section class="s7-aqua" aria-label="관상어 도감 대표 어종">
    <div class="s7-latest__inner">
      <h2 class="s7-latest__head">🐠 관상어 도감 · ${total}종</h2>
      <p class="s7-latest__desc">구피·베타·클라운피시부터 아홀로틀까지 — 종별 사육 환경, 먹이, 번식, 질병, 합사 정보를 한 장의 카드로 정리했습니다. 매일 새 어종이 추가됩니다.</p>
      <div class="s7-fish__grid">
${items}
      </div>
      <p class="s7-latest__more"><a href="https://soritok.com/aqua">도감 전체 ${total}종 보기 →</a></p>
    </div>
  </section>
  <!-- FISH_END -->`
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
    .s7-aqua{background:#eef4f6;border-top:1px solid #d9e4e8;padding:36px 16px 44px;}
    .s7-fish__grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:16px;margin-top:8px;}
    .s7-fish{display:flex;flex-direction:column;gap:6px;text-decoration:none;color:#2b3a40;background:#fff;border:1px solid #d9e4e8;border-radius:12px;padding:10px;transition:transform .15s,box-shadow .15s;}
    .s7-fish:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(30,60,80,.12);}
    .s7-fish__img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;background:#dfe9ee;}
    .s7-fish__name{font-weight:800;font-size:.95rem;margin-top:2px;}
    .s7-fish__sci{font-size:.75rem;color:#6d8590;font-style:italic;}
    .s7-fish__desc{font-size:.8rem;line-height:1.45;color:#4a5c64;}
  </style>`

export function injectBlogPosts(): Plugin {
  let html = ''
  return {
    name: 'inject-blog-posts',
    apply: 'build',
    async buildStart() {
      const [posts, fish] = await Promise.all([fetchPosts(), fetchFish()])
      const blogHtml = buildHtml(posts)
      const fishHtml = buildFishHtml(fish.cards, fish.total)
      const svcHtml = buildServicesHtml()
      // 순서: 블로그(글) → 도감(사진+설명) → 서비스 안내. 심사자·크롤러가 루트에서 두 콘텐츠 축을 바로 본다.
      html = blogHtml + fishHtml + svcHtml
      this.info(`루트 주입 — 블로그 ${posts.length}개, 도감 대표 ${fish.cards.length}종(총 ${fish.total}), 서비스 소개`)
      if (!blogHtml) this.warn('블로그 글을 못 가져옴')
      if (!fishHtml) this.warn('도감 데이터를 못 가져옴')
    },
    transformIndexHtml(original) {
      if (!html) return original
      // </body> 직전에 스타일 + 콘텐츠 삽입
      return original.replace('</body>', `${STYLE}\n${html}\n</body>`)
    },
  }
}
