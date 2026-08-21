from pathlib import Path

from PIL import Image


ASSET_NAMES = (
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
)


def optimize_icon(path: Path) -> None:
    with Image.open(path) as original:
        image = original.convert("RGB")
        image.thumbnail((512, 512), Image.Resampling.LANCZOS)
        optimized = image.quantize(colors=128, method=Image.Quantize.FASTOCTREE)
        temp_path = path.with_suffix(".optimized.png")
        optimized.save(temp_path, format="PNG", optimize=True, compress_level=9)
    temp_path.replace(path)


def main() -> None:
    assets_dir = Path(__file__).resolve().parents[1] / "assets" / "images"
    for name in ASSET_NAMES:
        optimize_icon(assets_dir / name)


if __name__ == "__main__":
    main()
