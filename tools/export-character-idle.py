#!/usr/bin/env python3
"""Export editable Characters/PSD wind phases into native game atlases.
Requires: pip install pillow psd-tools
"""
import argparse
from pathlib import Path
from PIL import Image
from psd_tools import PSDImage

NAMES = ("wanderer", "mage", "knight")
SIZE = (115, 160)

def export(name, source, destination):
    path = source / f"{name}_select_wind_3phases_115x160.psd"
    psd = PSDImage.open(path)
    if psd.size != SIZE:
        raise ValueError(f"{path}: expected 115x160, got {psd.size}")
    layers = {layer.name: layer for layer in psd}
    frames = []
    for i in (1, 2, 3):
        layer = layers.get(f"Phase {i}")
        if layer is None or layer.is_group():
            raise ValueError(f"{path}: expected pixel layer Phase {i}")
        pixels = layer.topil()
        if pixels is None:
            raise ValueError(f"{path}: Phase {i} has no pixels")
        frame = Image.new("RGBA", SIZE)
        frame.alpha_composite(pixels.convert("RGBA"), (layer.left, layer.top))
        if frame.getchannel("A").getextrema() != (255, 255):
            raise ValueError(f"{path}: Phase {i} must cover the entire canvas")
        frames.append(frame.convert("RGB"))
    atlas = Image.new("RGB", (345, 160))
    for i, frame in enumerate(frames):
        atlas.paste(frame, (i * 115, 0))
    destination.mkdir(parents=True, exist_ok=True)
    atlas.save(destination / f"{name}.webp", lossless=True, method=6)
    print(f"{name}: Phase 1 / Phase 2 / Phase 3 -> {destination / (name + '.webp')}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("psd_directory", type=Path)
    parser.add_argument("--output", type=Path,
                        default=Path(__file__).resolve().parents[1] / "dist/assets/characters/idle")
    args = parser.parse_args()
    for name in NAMES:
        export(name, args.psd_directory, args.output)
