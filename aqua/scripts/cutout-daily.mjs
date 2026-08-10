/**
 * 누끼 야간 자동 생성 (로컬 PC 전용)
 *
 * 소리톡 서버 CPU 는 AMD A6-3430MX(2011)로 SSE4.1/AVX 가 없어 sharp(libvips)와
 * onnxruntime 이 SIGILL 로 즉사한다. 그래서 누끼만 최신 CPU 가 있는 이 PC 에서
 * 만들어 서버로 올린다. 나머지(방향·유영층·활동성)는 서버가 매일 스스로 채운다.
 *
 * 하는 일
 *   1) 공개 API 에서 cutoutImageUrl 이 빈 카드를 찾는다
 *   2) 카드 사진을 받아 배경 제거 → 가장 큰 덩어리만 남김 → 420px WebP
 *   3) scp + docker cp 로 서버 uploads 볼륨에 올리고 DB 를 갱신한다
 *
 * 준비 (최초 1회)
 *   npm i @imgly/background-removal-node sharp     # 이 스크립트가 있는 폴더에서
 *   ssh dhind@61.35.3.148 "echo ok"                # 키 인증이 되는지 확인
 *
 * 실행
 *   node scripts/cutout-daily.mjs              # 누끼 없는 카드 전부
 *   node scripts/cutout-daily.mjs --limit 10   # 개수 제한
 *   node scripts/cutout-daily.mjs --dry        # 만들기만 하고 업로드는 안 함
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { removeBackground } from '@imgly/background-removal-node'
import sharp from 'sharp'

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const LIMIT = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : 0

const BASE = process.env.AQUA_BASE || 'https://soritok.com'
const SSH = process.env.AQUA_SSH || 'dhind@61.35.3.148'
const CONTAINER = process.env.AQUA_CONTAINER || 'soritok_aqua'
const WORK = path.join(os.tmpdir(), 'aqua-cutout')

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

async function makeCutout(srcFile) {
    // 윈도우 절대경로(C:\...)를 그대로 주면 "c:" 를 프로토콜로 읽어 실패한다
    const input = pathToFileURL(srcFile)
    const blob = await removeBackground(input, { output: { format: 'image/png', quality: 0.9 } })
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

// tar/scp 는 인자에 콜론이 있으면 "host:path" 로 읽는다. 윈도우 절대경로(C:\...)가
// 그대로 들어가면 실패하므로, 작업 폴더에서 상대 경로로만 부른다.
function sh(cmd, cmdArgs, cwd) {
    return execFileSync(cmd, cmdArgs, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

async function main() {
    fs.rmSync(WORK, { recursive: true, force: true })
    fs.mkdirSync(path.join(WORK, 'out'), { recursive: true })

    const { cards = [] } = await (await fetch(`${BASE}/aqua/api/fish?limit=500&t=${Date.now()}`)).json()
    let targets = cards.filter((c) => !c.cutoutImageUrl && (c.imageUrl || '').startsWith('/aqua/uploads/'))
    if (LIMIT > 0) targets = targets.slice(0, LIMIT)
    console.log(`전체 ${cards.length}종 / 누끼 필요 ${targets.length}종`)
    if (targets.length === 0) { console.log('할 일 없음'); return }

    const ts = Date.now()
    const done = []
    let warned = 0
    for (const c of targets) {
        try {
            const url = BASE + c.imageUrl.split('/').map(encodeURIComponent).join('/').replace(/%2F/g, '/')
            const res = await fetch(url)
            if (!res.ok) throw new Error(`사진 HTTP ${res.status}`)
            const src = path.join(WORK, `in_${c.id}.img`)
            fs.writeFileSync(src, Buffer.from(await res.arrayBuffer()))

            const { webp, suspicious } = await makeCutout(src)
            // 파일명에 타임스탬프 — uploads 는 7일 캐시라 같은 이름으로 덮으면
            // 기존 방문자에게 옛 이미지가 계속 보인다
            const file = `cut_${c.id}_${ts}.webp`
            fs.writeFileSync(path.join(WORK, 'out', file), webp)
            fs.unlinkSync(src)
            done.push({ id: c.id, name: c.name, file })
            if (suspicious) { warned++; console.log(`  ⚠ ${c.name}: 사진에 물고기가 둘 이상일 수 있음`) }
            console.log(`  ✓ ${c.id} ${c.name} → ${file} (${Math.round(webp.length / 1024)}KB)`)
        } catch (e) {
            console.log(`  ✗ ${c.id} ${c.name}: ${e.message}`)
        }
    }
    if (done.length === 0) { console.log('생성된 누끼 없음'); return }

    if (DRY) { console.log(`DRY — ${WORK}/out 에 ${done.length}장 생성, 업로드 안 함`); return }

    const sql = done.map((d) =>
        `UPDATE FishCard SET cutoutImageUrl='/aqua/uploads/${d.file}' WHERE id=${d.id};`).join('\n') + '\n'
    fs.writeFileSync(path.join(WORK, 'update.sql'), sql)

    sh('tar', ['-czf', 'cutouts.tgz', '-C', 'out', '.'], WORK)
    sh('scp', ['-o', 'BatchMode=yes', 'cutouts.tgz', 'update.sql', `${SSH}:~/`], WORK)
    sh('ssh', ['-o', 'BatchMode=yes', SSH,
        `rm -rf ~/cutdrop && mkdir ~/cutdrop && tar -xzf ~/cutouts.tgz -C ~/cutdrop ` +
        `&& docker cp ~/cutdrop/. ${CONTAINER}:/app/public/uploads/ ` +
        `&& docker cp ~/update.sql ${CONTAINER}:/tmp/update.sql ` +
        `&& docker exec ${CONTAINER} sh -lc '/prisma-cli/node_modules/.bin/prisma db execute ` +
        `--file /tmp/update.sql --schema /app/prisma/schema.prisma' >/dev/null 2>&1; ` +
        `rm -f ~/cutouts.tgz ~/update.sql; rm -rf ~/cutdrop`])

    console.log(`업로드 완료 ${done.length}종${warned ? ` (2마리 의심 ${warned}종 — 확인 권장)` : ''}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
