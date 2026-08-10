/**
 * 어항용 부가정보 자동 채우기 — 바라보는 방향 + 유영층 + 활동성 (+ 선택적으로 누끼)
 *
 * 매일 새 카드가 등록되면 사진만으로는 가상 어항에 제대로 넣을 수 없다.
 * 이 스크립트가 빠진 값을 채운다.
 *
 *   imageFacing     사진 속 물고기가 보는 방향 (진행 방향과 맞추는 데 필요)
 *   swimLayer       주 유영층 top/mid/bottom
 *   activityLevel   활동성 calm/normal/active
 *   cutoutImageUrl  배경 제거(누끼) — AQUA_ENABLE_CUTOUT=1 일 때만
 *
 * ── 누끼가 기본 비활성인 이유 ──────────────────────────────
 * 소리톡 서버 CPU 는 AMD A6-3430MX(2011) 로 SSE4.1/AVX 가 없다.
 * 배경 제거에 쓰는 sharp(libvips) 와 onnxruntime 의 커널이 이 명령어를
 * 전제로 빌드돼 있어 프로세스가 SIGILL(Illegal instruction)로 즉사한다.
 * prebuilt·소스빌드·wasm 세 경로 모두 확인했고 전부 같은 결과였다.
 * 따라서 누끼는 최신 CPU 가 있는 곳(로컬 PC 등)에서 돌린다.
 *
 * 사용:
 *   서버(방향·유영층·활동성만):
 *     SCRIPT=scripts/enrich-cards.mjs ./scripts/run-in-docker.sh --limit 15
 *   누끼까지(최신 CPU 환경):
 *     AQUA_ENABLE_CUTOUT=1 node scripts/enrich-cards.mjs --limit 15
 *
 *   --force        이미 값이 있는 카드도 다시 계산
 *   --only 구피    이름에 특정 문자열이 든 카드만
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const args = process.argv.slice(2)
const FORCE = args.includes('--force')
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0

const UPLOAD_DIR = process.env.AQUA_UPLOAD_DIR || '/app/public/uploads'
const BASE = process.env.AQUA_BASE || 'https://soritok.com'
const KEY = process.env.ANTHROPIC_API_KEY
const VISION_MODEL = process.env.AQUA_VISION_MODEL || 'claude-sonnet-5'
const ENABLE_CUTOUT = !!process.env.AQUA_ENABLE_CUTOUT

/* ---------------- 이미지 도구 (ImageMagick — CPU 명령어 요구가 없다) ---------------- */

const MAGICK = (() => {
    for (const bin of ['magick', 'convert']) {
        try { execFileSync(bin, ['-version'], { stdio: 'ignore' }); return bin } catch { /* 다음 후보 */ }
    }
    return null
})()

function magick(inFile, outFile, ops) {
    if (!MAGICK) throw new Error('ImageMagick 없음 (magick/convert)')
    const argv = MAGICK === 'magick' ? [inFile, ...ops, outFile] : [inFile, ...ops, outFile]
    execFileSync(MAGICK, argv, { stdio: 'ignore' })
}

/** 비전 질의용: 배경을 밝은 회색으로 채우고 512px 로 줄인 JPEG base64 */
function flatJpegB64(srcFile, { mirror = false } = {}) {
    const out = path.join(os.tmpdir(), `flat_${Date.now()}_${mirror ? 'm' : 'o'}.jpg`)
    const ops = ['-background', '#fafafa', '-flatten', '-resize', '512x512>']
    if (mirror) ops.push('-flop')
    ops.push('-quality', '88')
    magick(srcFile, out, ops)
    const b64 = fs.readFileSync(out).toString('base64')
    fs.unlinkSync(out)
    return b64
}

async function downloadCardPhoto(card) {
    const url = BASE + card.imageUrl.split('/').map(encodeURIComponent).join('/').replace(/%2F/g, '/')
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) })
    if (!res.ok) throw new Error(`사진 다운로드 실패 HTTP ${res.status}`)
    const file = path.join(os.tmpdir(), `card_${card.id}_${Date.now()}.img`)
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    return file
}

/* ---------------- 비전/텍스트 질의 ---------------- */

async function callClaude(content, maxTokens = 300) {
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'content-type': 'application/json', 'x-api-key': KEY, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({ model: VISION_MODEL, max_tokens: maxTokens, messages: [{ role: 'user', content }] }),
            })
            if (!res.ok) continue
            const j = await res.json()
            const t = (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('')
            return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
        } catch { /* 재시도 */ }
    }
    return null
}

const FACING_PROMPT = `이 이미지를 보고 답하세요.
A) 가장 큰 물고기의 눈은 이미지의 왼쪽 절반과 오른쪽 절반 중 어디에 있나요?
B) 그 물고기의 꼬리지느러미(끝이 부채꼴로 펼쳐진 쪽)는 어느 쪽 끝인가요?
C) 눈이 있는 쪽이 머리입니다. 머리가 향한 방향은?
JSON 한 줄로만: {"eye":"left|right","tail":"left|right","facing":"left|right"}`

/**
 * 방향을 그냥 물어보면 좌/우 편향이 심하다(예전 판별기는 정확도 44% 였다).
 * 좌우 반전한 이미지에도 같은 질문을 던져 답이 반대로 나올 때만 채택한다.
 * 교차검증에 실패하면 값을 쓰지 않고 다음 실행에서 다시 시도한다.
 */
async function detectFacing(srcFile) {
    const askImage = async (mirror) => callClaude([
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: flatJpegB64(srcFile, { mirror }) } },
        { type: 'text', text: FACING_PROMPT },
    ])
    const a = await askImage(false)
    const b = await askImage(true)
    if (!a?.facing || !b?.facing) return null
    return a.facing !== b.facing ? a.facing : null
}

async function detectTraits(card) {
    const d = await callClaude(
        `관상어 "${card.name}"(학명 ${card.scientificName}) 의 사육 특성을 답하세요.
설명: ${(card.pokedexEntry || '').slice(0, 300)}

A) 수조에서 주로 머무는 수층은? top(수면 근처) / mid(중층) / bottom(바닥)
B) 활동성은? calm(느긋·거의 정지) / normal(보통) / active(쉼 없이 헤엄침)
JSON 한 줄로만: {"layer":"top|mid|bottom","activity":"calm|normal|active"}`, 200)
    if (!d) return null
    if (!['top', 'mid', 'bottom'].includes(d.layer)) return null
    if (!['calm', 'normal', 'active'].includes(d.activity)) return null
    return d
}

/* ---------------- 누끼 (최신 CPU 환경에서만) ---------------- */

/** 알파에서 가장 큰 연결요소만 남긴다 — 사진에 물고기가 둘 이상이면 앞의 한 마리만 */
function keepLargestBlob(alpha, w, h, thr = 40, ds = 4) {
    const sw = Math.ceil(w / ds), sh = Math.ceil(h / ds)
    const on = new Uint8Array(sw * sh)
    for (let y = 0; y < sh; y++)
        for (let x = 0; x < sw; x++)
            on[y * sw + x] = alpha[Math.min(y * ds, h - 1) * w + Math.min(x * ds, w - 1)] > thr ? 1 : 0

    const lab = new Int32Array(sw * sh)
    const sizes = [0]
    let cur = 0
    const stack = []
    for (let i = 0; i < on.length; i++) {
        if (!on[i] || lab[i]) continue
        cur++; let n = 0
        stack.push(i); lab[i] = cur
        while (stack.length) {
            const q = stack.pop(); n++
            const qx = q % sw, qy = (q / sw) | 0
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = qx + dx, ny = qy + dy
                if (nx < 0 || ny < 0 || nx >= sw || ny >= sh) continue
                const ni = ny * sw + nx
                if (on[ni] && !lab[ni]) { lab[ni] = cur; stack.push(ni) }
            }
        }
        sizes[cur] = n
    }
    if (cur === 0) return { alpha, blobs: [] }

    let keep = 1
    for (let i = 1; i <= cur; i++) if (sizes[i] > sizes[keep]) keep = i
    const out = new Uint8Array(alpha.length)
    for (let y = 0; y < h; y++) {
        const sy = Math.min((y / ds) | 0, sh - 1)
        for (let x = 0; x < w; x++) {
            const sx = Math.min((x / ds) | 0, sw - 1)
            if (lab[sy * sw + sx] === keep) out[y * w + x] = alpha[y * w + x]
        }
    }
    return { alpha: out, blobs: sizes.slice(1).sort((a, b) => b - a) }
}

async function makeCutout(srcFile, sharp, removeBackground) {
    const blob = await removeBackground(srcFile, { output: { format: 'image/png', quality: 0.9 } })
    const png = Buffer.from(await blob.arrayBuffer())

    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width: w, height: h, channels } = info
    const alpha = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) alpha[i] = data[i * channels + 3]
    const { alpha: cleaned, blobs } = keepLargestBlob(alpha, w, h)
    for (let i = 0; i < w * h; i++) data[i * channels + 3] = cleaned[i]

    const webp = await sharp(data, { raw: { width: w, height: h, channels } })
        .trim()
        .resize({ width: 420 })
        .webp({ quality: 88, effort: 6 })
        .toBuffer()

    // 두 번째 덩어리가 본체의 8% 이상이면 사진에 물고기가 둘 이상일 가능성이 크다
    const suspicious = blobs[0] ? (blobs[1] || 0) / blobs[0] >= 0.08 : false
    return { webp, suspicious }
}

/* ---------------- 메인 ---------------- */

async function main() {
    if (!KEY) { console.error('ANTHROPIC_API_KEY 없음'); process.exit(2) }
    if (!MAGICK) { console.error('ImageMagick 없음 — magick 또는 convert 필요'); process.exit(2) }

    let sharp = null, removeBackground = null
    if (ENABLE_CUTOUT) {
        // SIGILL 로 프로세스가 즉사할 수 있어, 명시적으로 켰을 때만 불러온다
        sharp = (await import('sharp')).default
        removeBackground = (await import('@imgly/background-removal-node')).removeBackground
    }
    console.log(`누끼 ${ENABLE_CUTOUT ? '켬' : '끔 (AQUA_ENABLE_CUTOUT=1 로 활성)'} | ImageMagick=${MAGICK}`)

    let cards = await prisma.fishCard.findMany({
        select: {
            id: true, name: true, scientificName: true, pokedexEntry: true, imageUrl: true,
            cutoutImageUrl: true, imageFacing: true, swimLayer: true, activityLevel: true,
        },
        orderBy: { id: 'desc' },
    })
    cards = cards.filter((c) => (c.imageUrl || '').startsWith('/aqua/uploads/'))
    if (!FORCE) {
        cards = cards.filter((c) =>
            !c.imageFacing || !c.swimLayer || !c.activityLevel || (ENABLE_CUTOUT && !c.cutoutImageUrl))
    }
    if (ONLY) cards = cards.filter((c) => c.name.includes(ONLY))
    if (LIMIT > 0) cards = cards.slice(0, LIMIT)

    console.log(`대상 ${cards.length}종`)
    let ok = 0, fail = 0, warned = 0

    for (const c of cards) {
        let src = null
        try {
            const data = {}
            const needPhoto = FORCE || !c.imageFacing || (ENABLE_CUTOUT && !c.cutoutImageUrl)
            if (needPhoto) src = await downloadCardPhoto(c)

            if (ENABLE_CUTOUT && (FORCE || !c.cutoutImageUrl)) {
                const r = await makeCutout(src, sharp, removeBackground)
                // 파일명에 타임스탬프 — uploads 는 7일 캐시라 같은 이름으로 덮으면
                // 기존 방문자에게 옛 이미지가 계속 보인다
                const file = `cut_${c.id}_${Date.now()}.webp`
                fs.mkdirSync(UPLOAD_DIR, { recursive: true })
                fs.writeFileSync(path.join(UPLOAD_DIR, file), r.webp)
                data.cutoutImageUrl = `/aqua/uploads/${file}`
                if (r.suspicious) { warned++; console.log(`  ⚠ ${c.name}: 사진에 물고기가 둘 이상일 수 있음`) }
            }

            if (src && (FORCE || !c.imageFacing)) {
                const facing = await detectFacing(src)
                if (facing) data.imageFacing = facing
                else console.log(`  · ${c.name}: 방향 교차검증 실패 — 다음 실행에서 재시도`)
            }

            if (FORCE || !c.swimLayer || !c.activityLevel) {
                const t = await detectTraits(c)
                if (t) { data.swimLayer = t.layer; data.activityLevel = t.activity }
            }

            if (Object.keys(data).length === 0) { console.log(`  – ${c.name}: 변경 없음`); continue }
            await prisma.fishCard.update({ where: { id: c.id }, data })
            const shown = Object.entries(data).map(([k, v]) => `${k}=${String(v).replace('/aqua/uploads/', '')}`)
            console.log(`  ✅ ${c.name} → ${shown.join(' ')}`)
            ok++
        } catch (e) {
            fail++
            console.log(`  ❌ ${c.name}: ${e.message}`)
        } finally {
            if (src && fs.existsSync(src)) fs.unlinkSync(src)
        }
    }
    console.log(`완료 ok=${ok} fail=${fail} 경고=${warned}`)
    await prisma.$disconnect()
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })
