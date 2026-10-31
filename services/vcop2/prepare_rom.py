"""Map only the user's original VCOP2 ROM into verified Model 2A regions."""
from pathlib import Path
import argparse
import gzip
import hashlib
import json
import re
import subprocess
import xml.etree.ElementTree as ET
import zipfile
import zlib

ROOT = Path(__file__).resolve().parent.parent
EXPECTED_ZIP = '73a5e14d178a9d44fea266b832a840366807779d2e351d4c33d6fd40d16d3aff'
RUNTIME_REGIONS = {'maincpu', 'main_data', 'copro_data', 'polygons', 'textures', 'audiocpu', 'samples', 'copro_tgp_tables'}

def digest(data):
    return hashlib.sha256(data).hexdigest()

def prepare(source: Path, output: Path, vendor: Path):
    archive_data = source.read_bytes()
    assert digest(archive_data) == EXPECTED_ZIP, 'Input is not the previously verified user-supplied vcop2.zip'
    text = (vendor / 'data/games.xml').read_text(encoding='utf-8')
    match = re.search(r'<game name="vcop2"[\s\S]*?</game>', text)
    assert match, 'Pinned runtime database does not declare vcop2'
    game = ET.fromstring(re.sub(r'<!--.*?-->', '', match.group(0), flags=re.S))
    output.mkdir(parents=True, exist_ok=True)
    images = output / 'images'
    images.mkdir(exist_ok=True)
    manifest = {'game': 'Virtua Cop 2', 'set': 'vcop2', 'board': 'Model 2A-CRX', 'year': 1995,
                'source': 'User-supplied vcop2.zip', 'sourceSha256': EXPECTED_ZIP,
                'runtimeSource': 'https://github.com/dmanlfc/sm2-emu',
                'runtimeCommit': subprocess.check_output(['git', '-c', f'safe.directory={vendor.resolve().as_posix()}', 'rev-parse', 'HEAD'], cwd=vendor, text=True).strip(),
                'regions': [], 'members': [], 'mapping': 'Original chips, declared bus interleave, ROM_COPY mirrors and 68000 word swaps only. No game-code or asset replacement.'}
    member_names = set()
    runtime_data = []
    offset = 0
    with zipfile.ZipFile(source) as archive:
        assert len(archive.infolist()) == 30
        for region in game.findall('roms/region'):
            name = region.attrib['name']
            size = int(region.attrib['size'], 0)
            stride = int(region.get('stride', '1'), 0)
            chunk = int(region.get('chunk', '1'), 0)
            image = bytearray([int(region.get('fill', '0'), 0)]) * size
            for chip in region.findall('file'):
                entry = chip.attrib['name']
                payload = archive.read(entry)
                assert zlib.crc32(payload) == int(chip.attrib['crc'], 0), f'Chip CRC mismatch: {entry}'
                assert len(payload) % chunk == 0
                start = int(chip.attrib['offset'], 0)
                chunks = len(payload) // chunk
                assert start + (chunks - 1) * stride + chunk <= size
                for lane in range(chunk):
                    image[start + lane:start + chunks * stride + lane:stride] = payload[lane::chunk]
                member_names.add(entry)
                manifest['members'].append({'name': entry, 'bytes': len(payload), 'sha256': digest(payload), 'region': name})
            for copy in region.findall('copy'):
                src, dst, count = [int(copy.attrib[key], 0) for key in ('from', 'to', 'size')]
                assert src + count <= size and dst + count <= size
                image[dst:dst + count] = image[src:src + count]
            assert not region.findall('patch'), 'Do not patch original game instructions'
            if region.get('byte_swap') == 'true':
                image[0::2], image[1::2] = image[1::2], image[0::2]
            (images / f'{name}.bin').write_bytes(image)
            record = {'name': name, 'file': f'{name}.bin', 'bytes': size, 'sha256': digest(image), 'runtime': name in RUNTIME_REGIONS}
            if name in RUNTIME_REGIONS:
                record['offset'] = offset
                offset += size
                runtime_data.append(image)
            manifest['regions'].append(record)
        assert member_names == set(archive.namelist()), 'Every supplied chip must be accounted for'
    packed = gzip.compress(b''.join(runtime_data), compresslevel=6, mtime=0)
    (output / 'vcop2.pack.gz').write_bytes(packed)
    manifest['pack'] = {'file': 'vcop2.pack.gz', 'bytes': len(packed), 'sha256': digest(packed), 'expandedBytes': offset}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps({'set': manifest['set'], 'verifiedChips': len(member_names), 'regions': len(manifest['regions']), 'packedBytes': len(packed), 'expandedBytes': offset, 'runtimeCommit': manifest['runtimeCommit']}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('zip', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'work/vcop2-original/roms')
    parser.add_argument('--vendor', type=Path, default=ROOT / 'work/vcop2-original/vendor/sm2-emu')
    args = parser.parse_args()
    prepare(args.zip, args.output, args.vendor)
