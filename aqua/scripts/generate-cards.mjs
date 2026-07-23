/**
 * aquado 도감 카드 자동 생성기
 *
 * species-list.json 의 품종 중 아직 DB에 없는 것을 골라
 * Claude 로 도감 콘텐츠(요약 + 스탯 + 위키 본문 6종)를 작성하고,
 * iNaturalist 에서 CC 라이선스 사진을 받아 FishCard 로 저장한다.
 *
 * 사용:
 *   node scripts/generate-cards.mjs           # 기본 10개
 *   node scripts/generate-cards.mjs --limit 3 # 개수 지정
 *   node scripts/generate-cards.mjs --dry     # DB 저장 없이 미리보기
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const prisma = new PrismaClient()

const args = process.argv.slice(2)
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || (args.includes('--limit') ? 10 : 10)
const DRY = args.includes('--dry')
const MODEL = process.env.AQUA_MODEL || 'claude-sonnet-4-6'

const UPLOAD_DIR = process.env.AQUA_UPLOAD_DIR || '/app/public/uploads'

/* ---------------- 대기열 ---------------- */

/** species-list.json 을 평탄화해 {name, baseSpecies, variantName, scientificName, category} 목록으로 */
function loadQueue() {
  const raw = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'species-list.json'), 'utf-8'),
  )
  const out = []
  for (const g of raw.groups) {
    const push = (baseSpecies, scientificName, variant) => {
      // 품종명이 원종명을 포함하지 않으면 "품종 + 원종" 형태로 표시명 구성
      const name = variant.includes(baseSpecies) ? variant : `${variant} ${baseSpecies}`
      out.push({
        name,
        baseSpecies,
        variantName: variant === baseSpecies ? null : variant,
        scientificName,
        category: g.category,
        group: g.group,
      })
    }
    if (g.variants) {
      for (const v of g.variants) push(g.baseSpecies, g.scientificName, v)
    } else {
      for (const s of g.species) {
        for (const v of s.variants) push(s.baseSpecies, s.scientificName, v)
      }
    }
  }
  return out
}

/* ---------------- 콘텐츠 생성 ---------------- */

const SYSTEM = `너는 관상어 전문 도감 "아쿠아도"의 집필자다. 국내 관상어 애호가와 초보 사육자를 위해
어종별 카드를 작성한다. 수족관 실무 경험이 있는 전문가의 관점에서, 검증된 사육 정보만 담는다.

[문체]
- 정중한 해라체(~한다, ~이다). 존댓말·구어체 금지
- 과장·홍보성 표현 금지. 사실 위주로 담백하게
- 초보자도 이해할 수 있게 용어는 풀어서 설명

[정확성 — 매우 중요]
- 확실하지 않은 수치는 단정하지 말고 일반적으로 알려진 범위로 서술한다
- 존재하지 않는 연구나 출처를 지어내지 않는다
- 품종 개량 역사는 알려진 사실 범위에서만 서술하고, 불확실하면 "~로 알려져 있다" 식으로 표현한다

[정식 명칭 정규화 — canonicalName / scientificName]
- 입력으로 받은 표시명은 통칭·약칭일 수 있다. 관상어 업계에서 통용되는 정식 명칭으로 교정하라.
  예) "풀레드" → "알비노 풀레드 구피"로 흔히 통용되면 그렇게, 아니면 "풀레드 구피"
  예) "우파루파" → 정식 명칭은 "아홀로틀"(멕시코도롱뇽). canonicalName은 "아홀로틀"
  예) "아베니 복어" → "완두콩복어(피그미 퍼퍼)" 등 국내 통용명 우선
- canonicalName: 국내 관상어 애호가들이 실제로 부르는 가장 표준적인 이름 (도감 표제어로 쓸 이름)
- 통칭이 이미 표준적이면 입력명을 그대로 써도 된다. 억지로 바꾸지 마라.
- scientificName: 이 품종/개체의 정확한 학명. 입력 학명이 틀렸다고 판단되면 교정하라.

[출력 형식 — 반드시 JSON만]
{
  "canonicalName": "도감에 표제어로 쓸 정식 표시명 (통칭이면 그대로, 아니면 교정)",
  "scientificName": "정확한 학명 (라틴 이명법)",
  "imageQuery": "이 품종 사진을 Wikimedia Commons에서 찾기 위한 영어 검색어. 품종을 특정하는 관용 영어명 (예: \"Moscow blue guppy\", \"full red guppy\", \"golden axolotl\", \"halfmoon betta\"). 관상어 애호가/영어권에서 실제로 쓰는 표현으로.",
  "imageQueryBroad": "위 검색으로 사진이 없을 때 쓸 넓은 영어 폴백 검색어 = 원종의 영어 통칭 (예: \"guppy\", \"axolotl\", \"goldfish\", \"betta fish\"). 학명이 아니라 일반인이 부르는 영어 이름.",
  "pokedexEntry": "카드 요약. 2~3문장, 120자 내외. 이 품종의 가장 큰 특징을 잡아낸다",
  "difficultyLevel": 1~5 정수 (1=매우 쉬움, 5=매우 어려움),
  "grade": "기본" | "고정" | "희귀" | "브리딩",
  "temp": "22~26°C 형식",
  "ph": "pH 6.5~7.5 형식",
  "diet": "먹이 요약 (20자 내외)",
  "minTank": "30cm 이상 형식",
  "companionship": "합사 성향 요약 (25자 내외)",
  "maxSize": "최대 5cm 형식 (암수 차이 크면 함께 표기)",
  "detailHistory": "기원과 품종 개량 역사. 3~4문단, 각 문단 3~5문장. 원산지 서식 환경 → 품종 성립 과정 → 국내 유통 순서로",
  "detailAppearance": "외형과 발색 특징. 3~4문단. 체색/무늬 → 지느러미 형태 → 암수 구별 → 성장에 따른 변화, 유사 품종과의 구별점",
  "detailCare": "사육 환경 상세. 3~4문단. 수질/수온/수조 크기 → 여과와 바닥재/수초 → 먹이 급여와 물갈이 → 초보자가 흔히 하는 실수",
  "detailBreeding": "번식 방법. 3~4문단. 성 성숙과 암수 구별 → 번식 유도 조건 → 산란/출산 과정 → 치어 관리",
  "detailDisease": "주요 질병 3가지. 각 질병마다 한 문단씩, 증상 → 원인 → 치료법 → 예방 순서로",
  "detailCompanionship": "합사 가이드. 2~3문단. 성격과 어울리는 어종 → 피해야 할 어종과 이유 → 같은 종끼리의 밀도와 암수 비율"
}
JSON 외의 텍스트는 절대 출력하지 마라.`

function extractJson(s) {
  let t = s.trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const a = t.indexOf('{')
  const b = t.lastIndexOf('}')
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  return JSON.parse(t)
}

async function writeCard(anthropic, item) {
  const user = `[작성 대상]
- 표시명: ${item.name}
- 원종: ${item.baseSpecies}
- 품종: ${item.variantName ?? '(원종 자체)'}
- 학명: ${item.scientificName}
- 분류군: ${item.group}

위 품종의 도감 카드를 형식대로 작성하라. ${
    item.variantName
      ? '원종의 일반적 정보를 바탕으로 하되, 이 품종만의 고유한 외형·발색·주의점을 반드시 구체적으로 다뤄라.'
      : '원종의 표준적인 특징을 다뤄라.'
  }`

  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8000,
    temperature: 1,
    system: SYSTEM,
    messages: [{ role: 'user', content: user }],
  })
  const raw = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
  return extractJson(raw)
}

/* ---------------- 이미지 (Wikimedia Commons CC → iNaturalist 폴백) ---------------- */

const UA = { 'User-Agent': 'AquadoBot/1.0 (aquado; contact soritok.com)' }
// 이름만 겹치는 오탐 차단 (예: "Super Guppy" = NASA 수송기, 각종 항공기/로고/지도)
const BLOCK =
  /super guppy|aircraft|airplane|\bplane\b|boeing|airbus|aero|nasa|logo|map|diagram|chart|stamp|coin|flag|banknote/i

/** 이미지 버퍼를 uploads 에 저장하고 공개 경로 반환 */
function saveImage(buf, slug) {
  const file = `aqua_${slug}_${Date.now()}.jpg`
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buf)
  return `/aqua/uploads/${file}`
}

/** extmetadata 에서 저작자·라이선스를 뽑아 출처 문자열 생성 */
function commonsAttribution(meta) {
  const strip = (h) => (h ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const artist = strip(meta?.Artist?.value) || '작자 미상'
  const license = strip(meta?.LicenseShortName?.value) || 'CC'
  return `${artist} (${license}) · Wikimedia Commons`
}

/**
 * Wikimedia Commons 에서 검색어로 실사진(jpg/png) 1장을 받아 저장.
 * 관상용 품종 사진이 풍부하고 전부 자유 라이선스(CC/PD)라 관상어 도감에 적합.
 */
async function fetchFromCommons(query, slug) {
  if (!query) return null
  try {
    const q = encodeURIComponent(query)
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
      `&gsrsearch=${q}&gsrnamespace=6&gsrlimit=8&prop=imageinfo` +
      `&iiprop=url|mime|extmetadata&iiurlwidth=800&format=json&origin=*`
    const res = await fetch(url, { headers: UA })
    if (!res.ok) return null
    const data = await res.json()
    const pages = Object.values(data?.query?.pages ?? {})
    // 검색 점수(index) 순 정렬
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    for (const p of pages) {
      const info = p.imageinfo?.[0]
      if (!info) continue
      // 실사진만: jpeg/png (svg·gif·도안 제외)
      if (!/image\/(jpeg|png)/.test(info.mime ?? '')) continue
      if (BLOCK.test(p.title ?? '')) continue // 이름만 같은 오탐 제외
      const imgUrl = info.thumburl || info.url
      if (!imgUrl) continue
      const img = await fetch(imgUrl, { headers: UA })
      if (!img.ok) continue
      const buf = Buffer.from(await img.arrayBuffer())
      if (buf.length < 3000) continue // 너무 작은(깨진) 이미지 스킵
      return {
        url: saveImage(buf, slug),
        attribution: commonsAttribution(info.extmetadata),
      }
    }
    return null
  } catch {
    return null
  }
}

/** 최후 폴백: 학명으로 iNaturalist CC 사진 1장 */
async function fetchFromINat(scientificName, slug) {
  if (!scientificName) return null
  try {
    const q = encodeURIComponent(scientificName)
    const url =
      `https://api.inaturalist.org/v1/observations?taxon_name=${q}` +
      `&photo_license=cc0,cc-by,cc-by-nc&quality_grade=research&per_page=5&order_by=votes`
    const res = await fetch(url, { headers: UA })
    if (!res.ok) return null
    const data = await res.json()
    for (const obs of data.results ?? []) {
      const photo = obs.photos?.[0]
      if (!photo?.url) continue
      const imgUrl = photo.url.replace('/square', '/medium')
      const img = await fetch(imgUrl, { headers: UA })
      if (!img.ok) continue
      const buf = Buffer.from(await img.arrayBuffer())
      const attr = photo.attribution || `iNaturalist (${photo.license_code ?? 'CC'})`
      return { url: saveImage(buf, slug), attribution: `${attr} · iNaturalist` }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 이미지 수급: 품종 특정 검색 → 학명 검색(물고기만, 신뢰도 높음) →
 * 넓은 통칭 검색 → iNaturalist(학명) 순.
 * @param {{imageQuery?:string, imageQueryBroad?:string, scientificName?:string}} q
 */
async function fetchImage(q, slug) {
  return (
    (await fetchFromCommons(q.imageQuery, slug)) ||
    (await fetchFromCommons(q.scientificName, slug)) ||
    (await fetchFromCommons(q.imageQueryBroad, slug)) ||
    (await fetchFromINat(q.scientificName, slug))
  )
}

/* ---------------- 메인 ---------------- */

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY 없음')
    process.exit(2)
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  // 이름 정규화: 공백 제거 + 소문자 (표기 흔들림 방지)
  const norm = (s) => (s ?? '').replace(/\s+/g, '').toLowerCase()

  const queue = loadQueue()
  const dbCards = await prisma.fishCard.findMany({
    select: { name: true, scientificName: true, baseSpecies: true, variantName: true },
  })
  // 이미 있는 것: 정규화 이름 + "원종+품종" 조합 둘 다로 판정
  const existingNames = new Set(dbCards.map((f) => norm(f.name)))
  const existingCombos = new Set(dbCards.map((f) => norm(`${f.baseSpecies}${f.variantName ?? ''}`)))
  const isDup = (name, base, variant) =>
    existingNames.has(norm(name)) || existingCombos.has(norm(`${base}${variant ?? ''}`))

  const todo = queue.filter((q) => !isDup(q.name, q.baseSpecies, q.variantName)).slice(0, LIMIT)

  console.log(`전체 ${queue.length}종 / 기존 ${dbCards.length}종 / 이번 생성 ${todo.length}종`)
  if (!todo.length) {
    console.log('생성할 항목 없음 — 도감이 모두 채워졌다')
    return
  }

  const cats = await prisma.category.findMany()
  const catId = (slug) => cats.find((c) => c.slug === slug)?.id ?? cats[0].id

  let ok = 0
  for (const item of todo) {
    try {
      console.log(`\n[${ok + 1}/${todo.length}] ${item.name}`)
      const card = await writeCard(anthropic, item)

      // Claude가 정한 정식 명칭·학명 채택 (없으면 입력값 유지)
      const finalName = (card.canonicalName || item.name).trim()
      const finalSci = (card.scientificName || item.scientificName).trim()
      if (finalName !== item.name) {
        console.log(`  정식명 교정: "${item.name}" → "${finalName}"`)
      }

      // 정식명 기준 중복 재확인 (통칭이 기존 정식명과 겹칠 수 있음)
      if (existingNames.has(norm(finalName))) {
        console.log(`  ⏭ 정식명 "${finalName}" 이미 존재 → 건너뜀`)
        continue
      }

      const slug = finalName.replace(/\s+/g, '-').toLowerCase()
      const img = DRY
        ? null
        : await fetchImage(
            {
              imageQuery: card.imageQuery,
              imageQueryBroad: card.imageQueryBroad,
              scientificName: finalSci,
            },
            slug,
          )

      if (DRY) {
        console.log('  정식명:', finalName, '| 학명:', finalSci)
        console.log('  요약:', card.pokedexEntry)
        console.log('  난이도:', card.difficultyLevel, '| 수온:', card.temp, '| 크기:', card.maxSize)
        console.log('  본문 길이:', ['detailHistory','detailAppearance','detailCare','detailBreeding','detailDisease','detailCompanionship']
          .map((k) => (card[k] ?? '').length).join('/'))
        existingNames.add(norm(finalName)) // dry에서도 같은 실행 내 중복 방지
        ok++
        continue
      }

      await prisma.fishCard.create({
        data: {
          categoryId: catId(item.category),
          name: finalName,
          scientificName: finalSci,
          baseSpecies: item.baseSpecies,
          variantName: item.variantName,
          grade: card.grade ?? '기본',
          difficultyLevel: card.difficultyLevel ?? 3,
          pokedexEntry: card.pokedexEntry,
          temp: card.temp,
          ph: card.ph,
          diet: card.diet,
          minTank: card.minTank,
          companionship: card.companionship,
          maxSize: card.maxSize,
          detailHistory: card.detailHistory,
          detailAppearance: card.detailAppearance,
          detailCare: card.detailCare,
          detailBreeding: card.detailBreeding,
          detailDisease: card.detailDisease,
          detailCompanionship: card.detailCompanionship,
          imageUrl: img?.url ?? '',
          imageAttribution: img?.attribution ?? null,
          isPublished: true,
        },
      })
      // 같은 실행 내 후속 항목과 중복되지 않도록 캐시에 등록
      existingNames.add(norm(finalName))
      existingCombos.add(norm(`${item.baseSpecies}${item.variantName ?? ''}`))
      console.log(`  ✅ 저장 완료: ${finalName}${img ? ' (사진 포함)' : ' (사진 없음)'}`)
      ok++
      await new Promise((r) => setTimeout(r, 1500)) // API 부담 완화
    } catch (e) {
      console.error(`  ❌ 실패: ${e.message}`)
    }
  }
  console.log(`\n총 ${ok}/${todo.length}종 생성 완료`)
}

main()
  .catch((e) => {
    console.error('오류:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
