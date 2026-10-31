"""Build only sm2-emu's original Model2A machine; no SDL or desktop UI.

The upstream source and notices are kept intact. All generated files, cache,
temporary files and output stay in this task's workspace.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
import json
import os
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
WORK = ROOT.parent / 'work/vcop2-original'
SOURCE = WORK / 'vendor/sm2-emu'
BUILD = WORK / 'build'
WEB = WORK / 'web'
SDK_VALUE = os.environ.get('VCOP2_EMSDK') or os.environ.get('EMSDK')
if not SDK_VALUE:
    raise RuntimeError('Set VCOP2_EMSDK or EMSDK to the installed SDK root')
SDK = Path(SDK_VALUE)
EMCC = SDK / 'upstream/emscripten/emcc.py'
EMXX = EMCC.with_name('em++.py')
NODE = os.environ.get('EMSDK_NODE') or shutil.which('node')
if not NODE:
    raise RuntimeError('Node.js is required for the Musashi generator')
PYTHON = Path(sys.executable)
for directory in [BUILD, WEB, BUILD / 'objects', BUILD / 'temp']:
    directory.mkdir(parents=True, exist_ok=True)
env = os.environ.copy()
env['EM_CONFIG'] = str(SDK / '.emscripten')
env['EM_CACHE'] = str(BUILD / 'em-cache')
env['TEMP'] = env['TMP'] = env['EMCC_TEMP_DIR'] = str(BUILD / 'temp')
env['EMCC_CORES'] = '4'
cache_source = SDK / 'upstream/emscripten/cache'
if not (BUILD / 'em-cache/sysroot_install.stamp').exists():
    print('Copying existing SDK cache into workspace', flush=True)
    shutil.copytree(cache_source, BUILD / 'em-cache', dirs_exist_ok=True)

def run(args, cwd=ROOT):
    result = subprocess.run([str(arg) for arg in args], cwd=cwd, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding='utf-8', errors='replace')
    if result.stdout.strip():
        print(result.stdout, flush=True)
    if result.returncode:
        raise RuntimeError(f'Command failed ({result.returncode}): {args[0]}')

# Musashi's opcode generator is itself compiled for Node/WASM, so the build
# needs no newly installed native compiler, CMake, Make or Ninja.
musashi = SOURCE / '3rdparty/musashi'
if not (musashi / 'm68kmake.c').exists():
    raise RuntimeError('Initialize public 3rdparty/musashi submodule first')
generator = BUILD / 'm68kmake.cjs'
if not generator.exists():
    print('Building Musashi opcode generator for Node/WASM', flush=True)
    run([PYTHON, EMCC, '-O2', str(musashi / 'm68kmake.c'), '-sNODERAWFS=1', '-sENVIRONMENT=node', '-sALLOW_MEMORY_GROWTH=1', '-sEXIT_RUNTIME=1', '-o', generator])
generated = BUILD / 'musashi'
generated.mkdir(exist_ok=True)
if not (generated / 'm68kops.c').exists():
    print('Generating real 68000 opcode handlers', flush=True)
    run([NODE, generator, generated, musashi / 'm68k_in.c'])

cpp = [
    'core/archive.cpp', 'core/cpu_topology.cpp', 'core/log.cpp',
    'cpu/i960/i960.cpp', 'cpu/mb86233/mb86233.cpp',
    'cpu/m68000/m68000.cpp', 'cpu/z80/z80.cpp',
    'rom/game.cpp', 'rom/rom_set.cpp',
    'hw/copro_fifo.cpp', 'hw/copro_tgp.cpp',
    'hw/dsb2.cpp', 'hw/dsbz80.cpp', 'hw/eeprom_93c46.cpp',
    'hw/geometrizer.cpp', 'hw/i8251.cpp', 'hw/io_315_5649.cpp',
    'hw/m2comm.cpp', 'hw/model2.cpp', 'hw/model2_sound.cpp',
    'hw/model2_softrender.cpp', 'hw/model2_video.cpp',
    'hw/mpeg_audio.cpp', 'hw/save_state_io.cpp',
    'hw/scsp.cpp', 'hw/scsp_dsp.cpp', 'hw/segaic24.cpp',
    'hw/sega_315_5838_comp.cpp', 'hw/sega_315_5881_crypt.cpp',
]
jobs = [(SOURCE / 'src' / name, True) for name in cpp]
jobs += [(ROOT / 'web_bridge.cpp', True)]
jobs += [(musashi / 'm68kcpu.c', False), (generated / 'm68kops.c', False), (musashi / 'softfloat/softfloat.c', False)]
flags = ['-O2', '-fexceptions', '-fno-fast-math', '-ffp-contract=off', '-I' + str(SOURCE / 'src'), '-I' + str(musashi), '-I' + str(generated)]
flags += ['-DM68K_EMULATE_' + name + '=0' for name in ['010', 'EC020', '020', '030', '040', 'PMMU']]
# Every header participates in the cache key, so editing a bridge dependency
# never silently reuses an object compiled with an older interface.
headers = hashlib.sha256()
for header in sorted((SOURCE / 'src').rglob('*.h')) + sorted(musashi.rglob('*.h')):
    headers.update(header.read_bytes())
signature = headers.hexdigest() + json.dumps(flags)

def compile_one(job):
    source, cpp_source = job
    extra = (ROOT / 'gpu_bridge.inc').read_bytes() if source.name == 'web_bridge.cpp' else b''
    digest = hashlib.sha256((signature + str(source)).encode() + source.read_bytes() + extra).hexdigest()[:16]
    obj = BUILD / 'objects' / (source.stem + '-' + digest + '.o')
    if obj.exists():
        return obj
    command = [PYTHON, EMXX if cpp_source else EMCC, *flags, '-std=c++20' if cpp_source else '-std=c99', '-c', source, '-o', obj]
    if not cpp_source:
        command += ['-w', '-fno-common']
    run(command)
    return obj

objects = []
with ThreadPoolExecutor(max_workers=4) as pool:
    pending = [pool.submit(compile_one, job) for job in jobs]
    for index, future in enumerate(as_completed(pending), 1):
        objects.append(future.result())
        print(f'Compiled {index}/{len(jobs)}', flush=True)

objects = [future.result() for future in pending]
exports = ['rom_init', 'rom_step', 'rom_reset', 'rom_pixels', 'rom_width', 'rom_height', 'rom_pcm', 'rom_pcm_count', 'rom_sample_rate', 'rom_frames', 'rom_instructions', 'rom_polygons', 'rom_error', 'rom_peek', 'malloc', 'free']
exports += ['rom_nvram_load','rom_nvram_save','rom_cpu_ms','rom_tile_ms','rom_raster_ms','rom_gpu_mode','rom_wide_columns','rom_gpu_build','rom_gpu_vertices','rom_gpu_vertex_count','rom_gpu_batches','rom_gpu_batch_count','rom_gpu_rings','rom_gpu_ring_floats','rom_gpu_layer','rom_gpu_background','rom_gpu_texture','rom_gpu_xlat','rom_gpu_luma','rom_gpu_texture_generation','rom_gpu_table_generation','rom_gpu_build_ms']
link_flags = ['-O2', '-fexceptions', '-sMODULARIZE=1', '-sEXPORT_ES6=1', '-sENVIRONMENT=web,worker,node', '-sALLOW_MEMORY_GROWTH=1', '-sINITIAL_MEMORY=268435456', '-sMAXIMUM_MEMORY=1073741824', '-sSTACK_SIZE=8388608', '-sFORCE_FILESYSTEM=1', '-sEXPORTED_FUNCTIONS=' + json.dumps(['_' + name for name in exports]), '-sEXPORTED_RUNTIME_METHODS=' + json.dumps(['FS', 'ccall', 'UTF8ToString', 'HEAPU8', 'HEAPU32', 'HEAPF32'])]
response = BUILD / 'link.rsp'
response.write_text('\n'.join('"' + str(arg).replace('\\', '/').replace('"', '\\"') + '"' for arg in [*objects, *link_flags, '-o', WEB / 'core.mjs']), encoding='utf-8')
print('Linking original Model 2A WebAssembly machine', flush=True)
run([PYTHON, EMXX, '@' + str(response)])
print('Built ' + str(WEB / 'core.mjs'), flush=True)

assets = {}
for name in ['core.mjs', 'core.wasm']:
    data = (WEB / name).read_bytes()
    assets[name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
(WEB / 'runtime.json').write_text(json.dumps({'format': 1, 'runtimeCommit': 'cf83971ce1ca570d344e82f788a19d75daff2340', 'assets': assets}, indent=2), encoding='utf-8')
