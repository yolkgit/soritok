/**
 * 어항용 물고기 누끼(배경 제거) 생성 스크립트
 *
 * 서버(Alpine)에서는 onnxruntime-node 가 동작하지 않으므로,
 * 로컬 PC 에서 실행해 결과 WebP 를 서버 uploads 볼륨으로 올린다.
 *
 * 사용법:
 *   1) 임의 폴더에서: npm i @imgly/background-removal-node
 *   2) node make-cutouts.mjs            # cutoutImageUrl 이 없는 카드만 처리
 *   3) 출력된 안내대로 서버 업로드 + DB UPDATE 실행
 *
 * 결과물: ./cutouts/cut_<id>.webp  (투명 배경, 최대 폭 420px)
 */
import { removeBackground } from "@imgly/background-removal-node";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import sharp from "sharp";

const BASE = process.env.AQUA_BASE || "https://soritok.com";
const OUT = "cutouts";
await mkdir(OUT, { recursive: true });

const { cards = [] } = await (await fetch(`${BASE}/aqua/api/fish?t=${Date.now()}`)).json();
const targets = cards.filter((c) => !c.cutoutImageUrl && (c.imageUrl || "").startsWith("/aqua/uploads/"));
console.log(`전체 ${cards.length}종 / 누끼 필요 ${targets.length}종`);

let ok = 0;
for (const c of targets) {
    const out = `${OUT}/cut_${c.id}.webp`;
    if (existsSync(out)) { ok++; continue; }
    try {
        const url = BASE + c.imageUrl.split("/").map(encodeURIComponent).join("/").replace(/%2F/g, "/");
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await writeFile("_tmp_in.jpg", Buffer.from(await res.arrayBuffer()));

        const blob = await removeBackground("_tmp_in.jpg", { output: { format: "image/png", quality: 0.9 } });
        // 투명 여백 제거 + 리사이즈 + WebP (평균 27KB)
        await sharp(Buffer.from(await blob.arrayBuffer()))
            .trim()
            .resize({ width: 420, withoutEnlargement: true })
            .webp({ quality: 86 })
            .toFile(out);
        ok++;
        console.log(`  ✓ ${c.id} ${c.name}`);
    } catch (e) {
        console.log(`  ✗ ${c.id} ${c.name}: ${e.message}`);
    }
}

console.log(`\n완료 ${ok}종 → ./${OUT}\n`);
console.log(`다음 단계 (서버 반영):
  tar czf cutouts.tgz -C ${OUT} .
  scp cutouts.tgz dhind@61.35.3.148:~/
  ssh dhind@61.35.3.148 'mkdir -p ~/cutouts && tar xzf ~/cutouts.tgz -C ~/cutouts && docker cp ~/cutouts/. soritok_aqua:/app/public/uploads/'
  # 그리고 DB: UPDATE aquado.FishCard SET cutoutImageUrl='/aqua/uploads/cut_<id>.webp' WHERE id=<id>;`);
