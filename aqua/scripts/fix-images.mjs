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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

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

/** 검색어로 Commons 후보 실사진 목록 반환 [{title, imgUrl, attribution}] */
async function commonsCandidates(query) {
  if (!query) return []
  try {
    const q = encodeURIComponent(query)
    const url =
      `https://commons.wikimedia.org/w/api.php?action=query&generator=search` +
      `&gsrsearch=${q}&gsrnamespace=6&gsrlimit=12&prop=imageinfo` +
      `&iiprop=url|mime|extmetadata&iiurlwidth=800&format=json&origin=*`
    const res = await fetch(url, { headers: UA })
    if (!res.ok) return []
    const data = await res.json()
    const pages = Object.values(data?.query?.pages ?? {})
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
    const out = []
    for (const p of pages) {
      const info = p.imageinfo?.[0]
      if (!info) continue
      if (!/image\/(jpeg|png)/.test(info.mime ?? '')) continue
      const imgUrl = info.thumburl || info.url
      if (!imgUrl) continue
      out.push({ title: p.title, imgUrl, attribution: commonsAttribution(info.extmetadata) })
    }
    return out
  } catch {
    return []
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

  const usedTitles = new Set() // 카드 간 사진 중복 방지
  let ok = 0, fail = 0
  for (const c of cards) {
    try {
      const q = await queriesFor(anthropic, c.name, c.scientificName)
      const slug = c.name.replace(/\s+/g, '-').toLowerCase()
      // 특정 → 넓은 → 학명 순. rate limit 회피 위해 지연 + 충분하면 조기 중단
      const seen = new Set()
      const cands = []
      for (const term of [q.imageQuery, q.imageQueryBroad, c.scientificName]) {
        if (!term) continue
        await sleep(700)
        for (const x of await commonsCandidates(term)) {
          if (!seen.has(x.title)) { seen.add(x.title); cands.push(x) }
        }
        // 안 쓴 후보가 3개 이상 확보되면 추가 검색 생략
        if (cands.filter((x) => !usedTitles.has(x.title)).length >= 3) break
      }
      if (!cands.length) {
        console.log(`  ✗ ${c.name} — 사진 못 찾음 (검색: ${q.imageQuery} / ${q.imageQueryBroad})`)
        fail++; continue
      }
      // 안 쓴 사진 우선 정렬 (전부 썼으면 그냥 순서대로)
      const ordered = [
        ...cands.filter((x) => !usedTitles.has(x.title)),
        ...cands.filter((x) => usedTitles.has(x.title)),
      ]
      if (DRY) {
        const pick = ordered[0]
        usedTitles.add(pick.title)
        console.log(`  ○ ${c.name} → ${q.imageQuery} → ${pick.title} | ${pick.attribution}`)
        ok++; continue
      }
      // 후보를 순서대로 다운로드 시도, 첫 성공 채택
      let saved = null
      for (const pick of ordered) {
        try {
          const img = await fetch(pick.imgUrl, { headers: UA })
          if (!img.ok) continue
          const buf = Buffer.from(await img.arrayBuffer())
          if (buf.length < 3000) continue
          const url = saveImage(buf, slug)
          await prisma.fishCard.update({
            where: { id: c.id },
            data: { imageUrl: url, imageAttribution: pick.attribution },
          })
          usedTitles.add(pick.title)
          saved = pick
          break
        } catch { /* 다음 후보 */ }
      }
      if (!saved) { console.log(`  ✗ ${c.name} — 다운로드 전부 실패`); fail++; continue }
      console.log(`  ✅ ${c.name} → ${saved.title.replace('File:', '').slice(0, 34)} | ${saved.attribution.slice(0, 26)}`)
      ok++
    } catch (e) {
      console.log(`  ✗ ${c.name} — ${e.message}`); fail++
    }
  }
  console.log(`완료: 성공 ${ok} / 실패 ${fail}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
