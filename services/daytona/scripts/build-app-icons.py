"""Render the authored 64px pixel art without smoothing or extra palette colors."""
from io import BytesIO
from pathlib import Path
from struct import pack
from xml.etree import ElementTree as ET
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parent.parent / 'rom-web'
svg = ET.parse(root / 'app-icon.svg').getroot()
image = Image.new('RGB', (64, 64))
draw = ImageDraw.Draw(image)
for element in svg:
    if element.tag.split('}')[-1] != 'rect':
        continue
    attrs = element.attrib
    x, y, width, height = [int(attrs.get(k, 0)) for k in ['x', 'y', 'width', 'height']]
    draw.rectangle((x, y, x + width - 1, y + height - 1), fill=attrs['fill'])

def sized(size):
    return image.resize((size, size), Image.Resampling.NEAREST)

for size in [180, 192, 512]:
    sized(size).save(root / f'app-icon-{size}.png')
for size in [16, 32]:
    sized(size).save(root / f'favicon-{size}.png')

# ICO entries are separately pixel-scaled PNGs, with no encoder resampling.
entries, payloads, offset = [], [], 6 + 16 * 3
for size in [16, 32, 48]:
    buffer = BytesIO()
    sized(size).save(buffer, format='PNG')
    payload = buffer.getvalue()
    entries.append(pack('<BBBBHHII', size, size, 0, 0, 1, 24, len(payload), offset))
    payloads.append(payload)
    offset += len(payload)
(root / 'favicon.ico').write_bytes(pack('<HHH', 0, 1, 3) + b''.join(entries + payloads))
