"""Re-link an existing, private Revision A build; never copy ROM code into Git.

Requires its cached objects, generated sources, pinned upstream and Emscripten.
The three instruction sites are hash-checked before applying authored hooks.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse, hashlib, json, os, subprocess, sys

p=argparse.ArgumentParser()
p.add_argument('--runtime',type=Path,required=True)
p.add_argument('--upstream',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--debug',action='store_true')
a=p.parse_args()
native=Path(__file__).resolve().parent
runtime=a.runtime.resolve(); source=a.upstream.resolve(); out=a.output.resolve()
out.mkdir(parents=True,exist_ok=True)
private=out/'private-build';private.mkdir(exist_ok=True)
expected={'chunk_007':'301632b57107a8519f26bc444df4f9440ef393356f44952e1c529190215fbbcf',
          'chunk_008':'e3e4d1f4da2838cf7ab341d8ee6e9fe3a75078facab16b23de88ad0d9b1f65ff'}
jobs=[];replacements={}
for name,digest in expected.items():
    original=runtime/'build/gen/daytona'/f'{name}.cpp'
    if hashlib.sha256(original.read_bytes()).hexdigest()!=digest:
        raise SystemExit(f'Unsupported original code identity: {name}')
    text=original.read_text()
    text=text.replace('#include "runtime/gen_support.h"','#include "runtime/gen_support.h"\n#include "reverse.h"')
    sites=['0000ed28'] if name=='chunk_007' else ['00010954','00010960']
    for site in sites:
        start=text.index(f'L_{site}:');end=text.index('\nL_',start+1)
        block=text[start:end]
        if block.count('c.i960_write_dword_unaligned(')!=1:raise SystemExit('Hook shape changed')
        hook='web_reverse_display' if name=='chunk_007' else 'web_reverse_speed'
        block=block.replace('c.i960_write_dword_unaligned(',hook+'(c, ')
        text=text[:start]+block+text[end:]
    path=private/f'{name}.cpp';path.write_text(text)
    jobs.append(path);replacements[name]=path.with_suffix('.o')
jobs.extend([native/'web_bridge.cpp',native/'reverse.cpp'])
env=os.environ.copy();env['EM_CONFIG']=str(runtime/'emsdk/.emscripten')
env['TEMP']=env['TMP']=str(private);env['EMCC_CORES']='4'
emxx=runtime/'emsdk/upstream/emscripten/em++.py'
flags=['-std=c++20','-O2','-fexceptions','-fno-fast-math','-ffp-contract=off',
       '-DSOFTFLOAT_FAST_INT64','-DLITTLEENDIAN=1','-I'+str(native),
       '-I'+str(source/'src'),'-I'+str(source/'extern/ymfm/src'),
       '-I'+str(source/'extern/softfloat/source/include')]
if a.debug:flags.append('-DWEB_DRIVE_DEBUG')
def compile(path):
    obj=private/(path.stem+'.o')
    subprocess.run([sys.executable,str(emxx),*flags,'-c',str(path),'-o',str(obj)],env=env,check=True)
    return obj
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(compile,jobs))
replacements['web_bridge']=private/'web_bridge.o'
args=[]
for line in (runtime/'build/link.rsp').read_text().splitlines():
    arg=line.strip('"')
    for name,obj in replacements.items():
        if '/'+name+'-' in arg.replace('\\','/'):arg=str(obj)
    if arg.startswith('-sEXPORTED_FUNCTIONS='):
        names=json.loads(arg.split('=',1)[1]);names=[n for n in names if n!='_rom_sound_volumes']
        names+=['_rom_reverse_input','_rom_reverse_active']
        if a.debug:names.append('_rom_debug_read')
        arg='-sEXPORTED_FUNCTIONS='+json.dumps(names)
    if arg.endswith('/web/core.mjs'):arg=str(out/'core.mjs')
    if arg=='-O2' and a.debug:arg='-O0'
    args.append(arg)
args.insert(0,str(private/'reverse.o'))
response=private/'extension.rsp'
response.write_text('\n'.join('"'+arg.replace('\\','/')+'"' for arg in args))
subprocess.run([sys.executable,str(emxx),'@'+str(response)],cwd=source,env=env,check=True)
for name in ['core.mjs','core.wasm']:
    data=(out/name).read_bytes();print(name,len(data),hashlib.sha256(data).hexdigest())
