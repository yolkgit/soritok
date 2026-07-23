/**
 * 기존 FishCard 의 사진을 Wikimedia Commons(CC/PD) 사진으로 교체(백필).
 *
 * iNaturalist 야생 개체 사진 대신, 품종을 특정하는 영어 검색어로
 * Commons 에서 관상용 실사진을 받아 imageUrl/imageAttribution 을 갱신한다.
 * 카드 본문·스탯은 건드리지 않는다.
 *
 * 사용:
 *   node scripts/fix-images.mjs            # 전체 갱신
 *   node scripts/fix-images.mjs --dry      # 검색 결과만 미리보기
 *   node scripts/fix-images.mjs --only 미분류  # 이름 일부 매칭만
 */
import fs from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const MODEL = process.env.AQUA_MODEL_CHEAP || 'claude-haiku-4-5-20251001'
const UPLOAD_DIR = process.env.AQUA_UPLOAD_DIR || '/app/public/uploads'
const UA = { 'User-Agent': 'AquadoBot/1.0 (aquado; contact soritok.com)' }

function saveImage(buf, slug) {
  const file = `aqua_${slug}_${Date.now()}.jpg`
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buf)
  return `/aqua/uploads/${file}`
}

function commonsAttribution(meta) {
  const strip = (h) => (h ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  const artist = strip(meta?.Artist?.value) || '작자 미상'
  const license = strip(meta?.LicenseShortName?.value) || 'CC'
  return `${artist} (${license}) · Wikimedia Commons`
}

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
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    for (const p of pages) {
      const info = p.imageinfo?.[0]
      if (!info) continue
      if (!/image\/(jpeg|png)/.test(info.mime ?? '')) continue
      const imgUrl = info.thumburl || info.url
      if (!imgUrl) continue
      if (DRY) return { title: p.title, attribution: commonsAttribution(info.extmetadata) }
      const img = await fetch(imgUrl, { headers: UA })
      if (!img.ok) continue
      const buf = Buffer.from(await img.arrayBuffer())
      if (buf.length < 3000) continue
      return { url: saveImage(buf, slug), attribution: commonsAttribution(info.extmetadata) }
    }
    return null
  } catch {
    return null
  }
}

const SYSTEM = `너는 관상어 사진 검색어 생성기다. 주어진 한국어 어종명과 학명을 보고,
Wikimedia Commons 에서 그 품종의 실사진을 찾을 영어 검색어 2개를 만든다.
반드시 JSON만 출력:
{"imageQuery":"품종 특정 영어 검색어 (예: full red guppy, golden axolotl, halfmoon betta)",
 "imageQueryBroad":"넓은 폴백 영어 통칭 (예: guppy, axolotl, goldfish, betta fish)"}`

async function queriesFor(anthropic, name, sci) {
  const r = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 200,
    system: SYSTEM,
    messages: [{ role: 'user', content: `어종명: ${name}\n학명: ${sci}` }],
  })
  let t = (r.content[0]?.text ?? '').trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  return JSON.parse(t)
}

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY 없음'); process.exit(2)
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  let cards = await prisma.fishCard.findMany({
    select: { id: true, name: true, scientificName: true },
    orderBy: { id: 'asc' },
  })
  if (ONLY) cards = cards.filter((c) => c.name.includes(ONLY))
  console.log(`대상 ${cards.length}장${DRY ? ' (DRY)' : ''}`)

  let ok = 0, fail = 0
  for (const c of cards) {
    try {
      const q = await queriesFor(anthropic, c.name, c.scientificName)
      const slug = c.name.replace(/\s+/g, '-').toLowerCase()
      const img =
        (await fetchFromCommons(q.imageQuery, slug)) ||
        (await fetchFromCommons(q.imageQueryBroad, slug))
      if (!img) {
        console.log(`  ✗ ${c.name} — 사진 못 찾음 (검색: ${q.imageQuery} / ${q.imageQueryBroad})`)
        fail++; continue
      }
      if (DRY) {
        console.log(`  ○ ${c.name} → ${q.imageQuery} → ${img.title} | ${img.attribution}`)
      } else {
        await prisma.fishCard.update({
          where: { id: c.id },
          data: { imageUrl: img.url, imageAttribution: img.attribution },
        })
        console.log(`  ✅ ${c.name} → ${q.imageQuery} | ${img.attribution.slice(0, 50)}`)
      }
      ok++
    } catch (e) {
      console.log(`  ✗ ${c.name} — ${e.message}`); fail++
    }
  }
  console.log(`완료: 성공 ${ok} / 실패 ${fail}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
