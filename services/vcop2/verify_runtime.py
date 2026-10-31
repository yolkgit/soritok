"""Verify a flat external runtime before starting its service."""
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]).resolve()
expected={'core.mjs','core.wasm','runtime.json','manifest.json','vcop2.pack.gz','runtime-license.txt','runtime-notice.txt','source.zip'}
checks=json.loads((root/'checksums.json').read_text(encoding='utf-8-sig'))
assert set(checks)==expected,'Unexpected runtime inventory'
for name,info in checks.items():
 data=(root/name).read_bytes()
 assert len(data)==info['bytes'],f'Wrong byte size: {name}'
 assert hashlib.sha256(data).hexdigest()==info['sha256'],f'Hash mismatch: {name}'
build=json.loads((root/'runtime.json').read_text(encoding='utf-8-sig'))
for name in ['core.mjs','core.wasm']:assert build['assets'][name]==checks[name]
rom=json.loads((root/'manifest.json').read_text(encoding='utf-8-sig'))
assert rom['sourceSha256']=='73a5e14d178a9d44fea266b832a840366807779d2e351d4c33d6fd40d16d3aff'
assert rom['pack']['sha256']=='de103c2c653a4e27086aeb2f63e15553051d0efe41b45f7d76b39d2f60d33e96'
assert rom['pack']['sha256']==checks['vcop2.pack.gz']['sha256']
print('PASS: external runtime inventory, all hashes, WASM version and original ROM pack.')
