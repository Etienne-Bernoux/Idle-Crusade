"""
Chroma key : retire un fond magenta uni d'un sprite Nano Banana.

Usage:
    python scripts/chroma_key.py assets/sprites/paysan_raw.png
    -> produit assets/sprites/paysan.png (alpha transparent)

Tolérance configurable (par défaut 60 sur chaque canal),
permet d'attraper les pixels d'antialiasing autour du sprite.
"""

from PIL import Image
import sys
import os

TARGET = (255, 0, 255)   # magenta vif #FF00FF
TOLERANCE = 60           # +/- sur R, G, B

def is_magenta(px, tol=TOLERANCE):
    r, g, b = px[:3]
    tr, tg, tb = TARGET
    return abs(r - tr) < tol and abs(g - tg) < tol and abs(b - tb) < tol

def erase_bottom_right(pixels, w, h, size=200):
    """Efface le coin bas-droite (watermark Gemini)."""
    erased = 0
    for y in range(h - size, h):
        for x in range(w - size, w):
            if pixels[x, y][3] != 0:  # si pas déjà transparent
                pixels[x, y] = (0, 0, 0, 0)
                erased += 1
    return erased

def chroma_key(in_path, out_path):
    img = Image.open(in_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    removed = 0
    for y in range(h):
        for x in range(w):
            if is_magenta(pixels[x, y]):
                pixels[x, y] = (0, 0, 0, 0)
                removed += 1
    erased = erase_bottom_right(pixels, w, h)
    img.save(out_path, "PNG")
    print(f"OK: {in_path} -> {out_path}")
    print(f"   {removed} px de fond magenta retirés ({removed*100//(w*h)}%)")
    print(f"   {erased} px de watermark effacés (coin bas-droite)")

def batch(folder):
    """Traite tous les *_raw.png du dossier."""
    import glob
    pattern = os.path.join(folder, "*_raw.png")
    files = glob.glob(pattern)
    if not files:
        print(f"Aucun *_raw.png dans {folder}")
        return
    for in_path in sorted(files):
        # paysant_raw.png -> paysan.png (typo conservée)
        base = os.path.basename(in_path).replace("_raw.png", ".png")
        # corrige la typo paysant -> paysan
        base = base.replace("paysant", "paysan")
        out_path = os.path.join(folder, base)
        print(f"--- {os.path.basename(in_path)}")
        chroma_key(in_path, out_path)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python chroma_key.py <input.png> [output.png]")
        print("  python chroma_key.py --batch <folder>")
        sys.exit(1)
    if sys.argv[1] == "--batch":
        batch(sys.argv[2])
    else:
        in_path = sys.argv[1]
        if len(sys.argv) >= 3:
            out_path = sys.argv[2]
        else:
            out_path = in_path.replace("_raw", "")
            if out_path == in_path:
                base, ext = os.path.splitext(in_path)
                out_path = f"{base}_clean{ext}"
        chroma_key(in_path, out_path)
