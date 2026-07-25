/**
 * 도감 카드 이미지 자동 생성기 (AI 이미지 생성)
 *
 * 사진이 비어 있는 FishCard 를 찾아, 카드의 외형 설명을 바탕으로
 * "물고기 한 마리 + 수초 배경, 멋진 구도"의 관상어 사진을 생성해 붙인다.
 * (관리자가 ChatGPT 에서 수작업으로 하던 흐름을 그대로 자동화)
 *
 * 키는 둘 중 있는 것을 자동으로 사용한다:
 *   GEMINI_API_KEY  → gemini-2.5-flash-image (권장·저렴)
 *   OPENAI_API_KEY  → gpt-image-1
 *
 * 사용:
 *   node scripts/generate-images.mjs             # 사진 없는 카드 전부
 *   node scripts/generate-images.mjs --limit 5   # 개수 제한
 *   node scripts/generate-images.mjs --dry       # 프롬프트만 미리보기(생성·저장 안 함)
 *   node scripts/generate-images.mjs --only 구피 # 이름에 특정 문자열이 든 카드만
 *   node scripts/generate-images.mjs --force     # 이미 사진이 있는 카드도 새로 생성
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const FORCE = args.includes('--force')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0

const UPLOAD_DIR = process.env.AQUA_UPLOAD_DIR || '/app/public/uploads'
const PROMPT_MODEL = process.env.AQUA_MODEL_CHEAP || 'claude-haiku-4-5-20251001'
const GEMINI_MODEL = process.env.AQUA_IMAGE_MODEL || 'gemini-2.5-flash-image'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ---------------- 이미지 축소 (ImageMagick) ---------------- */
// sharp 는 이 서버 CPU 에서 Illegal instruction 으로 죽어 쓰지 않는다.

let _imBin = null
function imBin() {
  if (_imBin) return _imBin
  for (const b of ['magick', 'convert']) {
    try {
      execFileSync(b, ['-version'], { stdio: 'ignore' })
      _imBin = b
      return b
    } catch { /* 다음 후보 */ }
  }
  throw new Error('ImageMagick(convert/magick) 없음')
}

/** 버퍼 또는 파일경로를 받아 웹용 JPEG(폭 최대 1024, q82) 버퍼로 변환 */
function toWebJpeg(input) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aqua-'))
  const src = path.join(tmp, 'src')
  const out = path.join(tmp, 'out.jpg')
  try {
    if (Buffer.isBuffer(input)) fs.writeFileSync(src, input)
    else fs.copyFileSync(input, src)
    // '1024x>' = 가로가 1024보다 클 때만 축소 (확대 안 함)
    execFileSync(imBin(), [src, '-resize', '1024x>', '-quality', '82', out], {
      stdio: 'ignore',
    })
    return fs.readFileSync(out)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

/* ---------------- 프롬프트 작성 (Claude Haiku) ---------------- */

const SYSTEM = `너는 관상어 도감용 사진을 만들기 위한 "이미지 생성 프롬프트 작가"다.
주어진 어종 정보(이름·학명·외형 설명)를 읽고, 그 품종의 특징이 정확히 드러나는
영어 이미지 프롬프트 한 단락을 쓴다.

지켜야 할 것:
- 물고기는 딱 한 마리(암수 구별이 중요한 종이면 두 마리까지). 옆모습 위주.
- 그 품종을 결정짓는 체색·무늬·지느러미 형태를 구체적인 영어로 묘사할 것.
- 배경은 수초가 우거진 수조. 초록 보케(bokeh)로 부드럽게 흐릴 것.
- 사람·손·어항 장비·글자·워터마크·로고는 절대 넣지 말 것.
- 사진처럼 사실적으로(photorealistic). 일러스트·만화체 금지.

반드시 JSON만 출력:
{"prompt":"영어 이미지 생성 프롬프트 한 단락"}`

async function buildPrompt(anthropic, card) {
  const appearance = (card.detailAppearance || card.pokedexEntry || '').slice(0, 700)
  const r = await anthropic.messages.create({
    model: PROMPT_MODEL,
    max_tokens: 600,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `어종명: ${card.name}\n학명: ${card.scientificName}\n외형 설명:\n${appearance}`,
      },
    ],
  })
  let t = (r.content[0]?.text ?? '').trim()
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const a = t.indexOf('{'), b = t.lastIndexOf('}')
  if (a >= 0 && b > a) t = t.slice(a, b + 1)
  const { prompt } = JSON.parse(t)
  // 공통 스타일 지시 — 관리자가 쓰던 "물고기와 배경만 나오게 멋진 구도로"
  return (
    `${prompt} Professional aquarium photography, sharp focus on the fish, ` +
    `shallow depth of field, soft natural lighting, clean composition with only ` +
    `the fish and the planted background. No text, no watermark, no logo, ` +
    `no people, no hands, no equipment.`
  )
}

/* ---------------- 이미지 생성 ---------------- */

/** Gemini (gemini-2.5-flash-image) 로 이미지 1장 생성 → {buf, mime} */
async function genGemini(prompt, key) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const parts = data?.candidates?.[0]?.content?.parts ?? []
  const img = parts.find((p) => p.inlineData?.data)
  if (!img) {
    const txt = parts.find((p) => p.text)?.text ?? ''
    throw new Error(`이미지 없음 ${txt.slice(0, 120)}`)
  }
  return {
    buf: Buffer.from(img.inlineData.data, 'base64'),
    mime: img.inlineData.mimeType || 'image/png',
  }
}

/** OpenAI (gpt-image-1) 로 이미지 1장 생성 → {buf, mime} */
async function genOpenAI(prompt, key) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'gpt-image-1', prompt, n: 1, size: '1024x1024' }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw new Error('이미지 없음')
  return { buf: Buffer.from(b64, 'base64'), mime: 'image/png' }
}

/* ---------------- 메인 ---------------- */

async function main() {
  const anthKey = process.env.ANTHROPIC_API_KEY
  const gemKey = process.env.GEMINI_API_KEY
  const oaiKey = process.env.OPENAI_API_KEY
  if (!anthKey) { console.error('ANTHROPIC_API_KEY 없음 (프롬프트 작성용)'); process.exit(2) }

  const provider = gemKey ? 'gemini' : oaiKey ? 'openai' : null
  if (!provider && !DRY) {
    console.error(
      '이미지 생성 키가 없다. GEMINI_API_KEY 또는 OPENAI_API_KEY 를 ~/soritok/.env 에 넣어라.\n' +
      '(프롬프트만 확인하려면 --dry 로 실행)',
    )
    process.exit(2)
  }
  const anthropic = new Anthropic({ apiKey: anthKey })

  let cards = await prisma.fishCard.findMany({
    select: {
      id: true, name: true, scientificName: true,
      pokedexEntry: true, detailAppearance: true, imageUrl: true,
    },
    orderBy: { id: 'asc' },
  })
  if (!FORCE) cards = cards.filter((c) => !c.imageUrl)
  if (ONLY) cards = cards.filter((c) => c.name.includes(ONLY))
  if (LIMIT > 0) cards = cards.slice(0, LIMIT)

  console.log(`대상 ${cards.length}장 | 생성기: ${provider ?? '(없음·DRY)'}${DRY ? ' | DRY' : ''}`)
  let ok = 0, fail = 0

  for (const c of cards) {
    try {
      const prompt = await buildPrompt(anthropic, c)
      if (DRY) {
        console.log(`\n○ ${c.name}\n  ${prompt.slice(0, 300)}...`)
        ok++; continue
      }
      const { buf, mime } = provider === 'gemini'
        ? await genGemini(prompt, gemKey)
        : await genOpenAI(prompt, oaiKey)

      // 웹용으로 축소·JPEG 변환 (원본 PNG는 1.5MB대 → 목록 로딩이 무거워진다)
      const jpg = toWebJpeg(buf)
      const slug = c.name.replace(/\s+/g, '-').toLowerCase()
      const file = `aqua_${slug}_${Date.now()}.jpg`
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      fs.writeFileSync(path.join(UPLOAD_DIR, file), jpg)

      await prisma.fishCard.update({
        where: { id: c.id },
        data: {
          imageUrl: `/aqua/uploads/${file}`,
          imageAttribution: `AI 생성 이미지 (${provider === 'gemini' ? 'Google Gemini' : 'OpenAI'})`,
        },
      })
      console.log(
        `  ✅ ${c.name} → ${file} ` +
        `(${Math.round(buf.length / 1024)}KB → ${Math.round(jpg.length / 1024)}KB)`,
      )
      ok++
      await sleep(1500) // API 속도 제한 여유
    } catch (e) {
      console.log(`  ✗ ${c.name} — ${e.message}`)
      fail++
    }
  }
  console.log(`완료: 성공 ${ok} / 실패 ${fail}`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
