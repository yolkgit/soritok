"""Build the original pixel-art badge/city/reticle icon without external assets."""
from pathlib import Path
import struct,zlib
root=Path(__file__).resolve().parent/'web'
grid=[['#08111f']*32 for _ in range(32)]
def rect(x,y,w,h,c):
    for j in range(y,y+h):
        for i in range(x,x+w):
            if 0<=i<32 and 0<=j<32:grid[j][i]=c
# City silhouette and patrol light under a pixelated sight.
for x,y,w,h in [(3,19,5,10),(9,15,5,14),(15,20,4,9),(20,13,5,16),(26,18,3,11)]:
    rect(x,y,w,h,'#193b59')
    for wy in range(y+2,28,4):rect(x+1,wy,1,1,'#4b8295')
rect(5,26,22,3,'#12304c')
rect(9,25,5,2,'#ff5b60');rect(17,25,5,2,'#4cdcf7')
for x,y,w,h in [(8,5,6,2),(18,5,6,2),(5,8,2,6),(25,8,2,6),(5,18,2,6),(25,18,2,6),(8,25,6,2),(18,25,6,2)]:
    rect(x,y,w,h,'#71efff')
rect(15,4,2,7,'#d6faff');rect(15,21,2,7,'#d6faff');rect(4,15,7,2,'#d6faff');rect(21,15,7,2,'#d6faff')
rect(14,14,4,4,'#deff64');rect(15,15,2,2,'#f9ffd7')
# Use one rect per horizontal color run for reproducible sharp SVG/PNGs.
runs=[]
for y,row in enumerate(grid):
    start=0
    for end in range(1,33):
        if end==32 or row[end]!=row[start]:
            runs.append((start,y,end-start,1,row[start]));start=end
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><title>Virtua Cop 2 city sight</title>'+''.join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{c}"/>' for x,y,w,h,c in runs)+'</svg>'
(root/'icon.svg').write_text(svg,encoding='utf-8')
def png(size):
    rows=bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            c=grid[y*32//size][x*32//size]
            rows.extend(bytes.fromhex(c[1:])+b'\xff')
    def chunk(t,data):return struct.pack('>I',len(data))+t+data+struct.pack('>I',zlib.crc32(t+data))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(rows,9))+chunk(b'IEND',b'')
for size in [16,32,180,192,512]:(root/f'icon-{size}.png').write_bytes(png(size))
images=[png(16),png(32)];ico=struct.pack('<HHH',0,1,2);offset=6+16*2
for size,data in zip([16,32],images):
    ico+=struct.pack('<BBBBHHII',size,size,0,0,1,32,len(data),offset);offset+=len(data)
(root/'favicon.ico').write_bytes(ico+b''.join(images))
print('Created SVG, ICO and 16/32/180/192/512 PNG icons.')
