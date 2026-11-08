"""Lightmap encoding: HDR atlas → 8-bit PNG ready for KTX2, with the empty space filled.

Used by bake.py after denoising. Also runs on its own to re-encode a finished bake from its
EXRs (no re-bake needed):
  blender -b --factory-startup -P tools/bake/encode.py -- assets-src/bake/out

Why fill: the space between UV islands is black after baking. The GPU's mipmaps average texels,
so on a small or distant object the black seeps into its islands and it goes dark. Push-pull
filling gives every empty texel the colour of the nearest islands, at every mip level.
"""

import json, os, sys
import numpy as np

EMPTY = 1e-4  # a texel darker than this (in linear light) counts as outside every island


def fill(rgb, covered):
    """Push-pull fill: average the covered texels down a pyramid, then pull the averages back
    up into the empty texels. Covered texels keep their exact value."""
    h, w, _ = rgb.shape
    pyr = [(rgb * covered[..., None], covered.astype(np.float32))]
    while pyr[-1][1].shape[0] > 1 and pyr[-1][1].shape[1] > 1 and pyr[-1][1].shape[0] % 2 == 0 and pyr[-1][1].shape[1] % 2 == 0:
        c, k = pyr[-1]
        hh, ww = k.shape[0] // 2, k.shape[1] // 2
        pyr.append((c.reshape(hh, 2, ww, 2, 3).sum((1, 3)), k.reshape(hh, 2, ww, 2).sum((1, 3))))
    c, k = pyr[-1]
    up = (c / np.maximum(k, 1e-8)[..., None]).astype(np.float32)
    for c, k in reversed(pyr[:-1]):
        up = np.repeat(np.repeat(up, 2, axis=0), 2, axis=1)
        avg = c / np.maximum(k, 1e-8)[..., None]
        up = np.where((k > 0)[..., None], avg, up).astype(np.float32)
    return up


def encode(img, png_path):
    """Write img (a Blender float image) as an 8-bit PNG, value = (light / range) ^ (1 / 2.2).
    Returns the range (the brightest light the atlas holds, ≥ 1)."""
    import bpy
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
    rgb = np.ascontiguousarray(px.reshape(h, w, 4)[..., :3])
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    covered = lum > EMPTY
    rgb = fill(rgb, covered)
    rng = float(max(1.0, np.percentile(lum[covered], 99.7) * 1.15)) if covered.any() else 1.0
    enc = np.clip(rgb / rng, 0, 1) ** (1 / 2.2)
    out = bpy.data.images.new(os.path.basename(png_path), w, h, alpha=False)
    flat = np.ones((h, w, 4), dtype=np.float32); flat[..., :3] = enc
    out.pixels.foreach_set(flat.ravel())
    out.filepath_raw = png_path; out.file_format = "PNG"; out.save()
    print(f"[encode] {os.path.basename(png_path)}: range {rng:.2f}, mean light {float(lum[covered].mean()):.3f}, "
          f"{100 * covered.mean():.0f}% of the atlas covered", flush=True)
    return rng


if __name__ == "__main__" and "--" in sys.argv:
    import bpy
    out_dir = os.path.abspath(sys.argv[sys.argv.index("--") + 1])
    meta_path = os.path.join(out_dir, "bake.json")
    meta = json.load(open(meta_path))
    for a in meta["atlases"]:
        img = bpy.data.images.load(os.path.join(out_dir, a["file"] + ".exr"), check_existing=False)
        a["range"] = round(encode(img, os.path.join(out_dir, a["file"] + ".png")), 4)
    json.dump(meta, open(meta_path, "w"), indent=1)
