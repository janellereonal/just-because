"""Contact sheet of screenshots. usage: python3 sheet.py out.png cols w img1 img2 ...
Each image is scaled to width w and labelled with its file name."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw

out, cols, w, *files = sys.argv[1:]
cols, w = int(cols), int(w)
ims = []
for f in files:
    im = Image.open(f).convert("RGB")
    im = im.resize((w, int(im.height * w / im.width)))
    ims.append((Path(f).stem, im))
h = max(im.height for _, im in ims) + 22
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (w + 8) + 8, rows * (h + 8) + 8), "#222")
d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(ims):
    x, y = 8 + (i % cols) * (w + 8), 8 + (i // cols) * (h + 8)
    sheet.paste(im, (x, y + 22))
    d.text((x + 2, y + 4), name, fill="#eee")
sheet.save(out)
