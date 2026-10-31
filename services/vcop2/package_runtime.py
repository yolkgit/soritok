"""Package the validated runtime OUTSIDE Git, including corresponding source."""
from pathlib import Path
import argparse,hashlib,json,shutil,subprocess,zipfile
ROOT=Path(__file__).resolve().parent
WORK=ROOT.parent/'work/vcop2-original'
parser=argparse.ArgumentParser()
parser.add_argument('output',type=Path)
args=parser.parse_args()
out=args.output.resolve()
out.mkdir(parents=True,exist_ok=True)
files={'core.mjs':WORK/'web/core.mjs','core.wasm':WORK/'web/core.wasm',
'runtime.json':WORK/'web/runtime.json','manifest.json':WORK/'roms/manifest.json',
'vcop2.pack.gz':WORK/'roms/vcop2.pack.gz','runtime-license.txt':WORK/'vendor/sm2-emu/LICENSE',
'runtime-notice.txt':WORK/'vendor/sm2-emu/NOTICE'}
for name,source in files.items():shutil.copyfile(source,out/name)
vendor=WORK/'vendor/sm2-emu'
tracked=subprocess.check_output(['git','-c',f'safe.directory={vendor.as_posix()}','ls-files','--recurse-submodules'],cwd=vendor,text=True,encoding='utf-8').splitlines()
with zipfile.ZipFile(out/'source.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
 for name in tracked:
  file=vendor/name
  if file.is_file():archive.write(file,'vendor/sm2-emu/'+name)
 for file in ROOT.rglob('*'):
  if file.is_file() and not any(part in {'.git','__pycache__','node_modules','work','runtime-assets'} for part in file.relative_to(ROOT).parts):
   archive.write(file,'vcop2-port/'+file.relative_to(ROOT).as_posix())
receipt={}
for file in sorted(out.iterdir()):
 if file.is_file() and file.name!='checksums.json':
  receipt[file.name]={'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest()}
(out/'checksums.json').write_text(json.dumps(receipt,indent=2),encoding='utf-8')
print(json.dumps({'files':len(receipt),'bytes':sum(v['bytes'] for v in receipt.values()),'romInGit':False,'output':str(out)},indent=2))
