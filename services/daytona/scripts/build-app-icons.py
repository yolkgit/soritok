"""Render the authored SVG primitives to Home Screen PNG icons with Pillow."""
from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent.parent/'rom-web'
svg=ET.parse(root/'app-icon.svg').getroot()
image=Image.new('RGB',(1024,1024));draw=ImageDraw.Draw(image)
for element in svg:
    attrs=element.attrib;tag=element.tag.split('}')[-1]
    if tag=='rect':
        x,y,w,h=[float(attrs.get(k,0))*2 for k in ['x','y','width','height']]
        draw.rounded_rectangle((x,y,x+w,y+h),radius=float(attrs.get('rx',0))*2,fill=attrs['fill'])
    elif tag=='polygon':
        points=[tuple(float(n)*2 for n in point.split(',')) for point in attrs['points'].split()]
        draw.polygon(points,fill=attrs['fill'])
for size in [180,192,512]:
    image.resize((size,size),Image.Resampling.LANCZOS).save(root/f'app-icon-{size}.png')
