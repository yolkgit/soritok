/**
 * 기존 카드 이미지 최적화 — 큰 PNG 를 웹용 JPEG(폭 1024, q82)로 변환한다.
 *
 * AI 생성 원본은 장당 1.5MB 대라 도감 목록(수십 장)이 매우 무겁다.
 * 이미지를 다시 생성하지 않고(비용 0) 파일만 변환한 뒤 imageUrl 을 갱신한다.
 *
 * 사용:
 *   node scripts/optimize-images.mjs         # 변환 실행
 *   node scripts/optimize-images.mjs --dry   # 대상만 확인
 */
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const DRY = process.argv.includes('--dry')
const UPLOAD_DIR = process.env.AQUA_UPLOAD_DIR || '/app/public/uploads'
const MAX_WIDTH = 1024
const QUALITY = 82

async function main() {
  const cards = await prisma.fishCard.findMany({
    select: { id: true, name: true, imageUrl: true },
    orderBy: { id: 'asc' },
  })
  // 로컬 업로드 PNG 만 대상 (외부 URL·이미 jpg 인 것은 건너뜀)
  const targets = cards.filter(
    (c) => c.imageUrl?.startsWith('/aqua/uploads/') && /\.png$/i.test(c.imageUrl),
  )
  console.log(`대상 ${targets.length}장${DRY ? ' (DRY)' : ''}`)

  let ok = 0, fail = 0, before = 0, after = 0
  for (const c of targets) {
    try {
      const oldName = path.basename(c.imageUrl)
      const oldPath = path.join(UPLOAD_DIR, oldName)
      if (!fs.existsSync(oldPath)) {
        console.log(`  ✗ ${c.name} — 파일 없음 (${oldName})`)
        fail++; continue
      }
      const srcSize = fs.statSync(oldPath).size
      const jpg = await sharp(oldPath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: QUALITY, mozjpeg: true })
        .toBuffer()
      before += srcSize
      after += jpg.length

      if (DRY) {
        console.log(
          `  ○ ${c.name}: ${Math.round(srcSize / 1024)}KB → ${Math.round(jpg.length / 1024)}KB`,
        )
        ok++; continue
      }
      const newName = oldName.replace(/\.png$/i, '.jpg')
      fs.writeFileSync(path.join(UPLOAD_DIR, newName), jpg)
      await prisma.fishCard.update({
        where: { id: c.id },
        data: { imageUrl: `/aqua/uploads/${newName}` },
      })
      fs.unlinkSync(oldPath) // 원본 PNG 제거 (볼륨 용량 절약)
      console.log(
        `  ✅ ${c.name}: ${Math.round(srcSize / 1024)}KB → ${Math.round(jpg.length / 1024)}KB`,
      )
      ok++
    } catch (e) {
      console.log(`  ✗ ${c.name} — ${e.message}`)
      fail++
    }
  }
  const mb = (n) => (n / 1024 / 1024).toFixed(1)
  console.log(`완료: 성공 ${ok} / 실패 ${fail} | 총 ${mb(before)}MB → ${mb(after)}MB`)
  await prisma.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
