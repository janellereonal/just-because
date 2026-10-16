"""PNG clay stills -> WebP at 512 and 256 (transparent). usage: python3 clay_webp.py <pngDir> <outDir>"""
import sys
from pathlib import Path
from PIL import Image
src, dst = Path(sys.argv[1]), Path(sys.argv[2])
dst.mkdir(parents=True, exist_ok=True)
for f in sorted(src.glob("*.png")):
    im = Image.open(f).convert("RGBA")
    for size, suffix in ((512, ""), (256, "@256")):
        im.resize((size, size), Image.LANCZOS).save(dst / f"{f.stem}{suffix}.webp", "WEBP", quality=88, method=6)
    print(f.stem)
