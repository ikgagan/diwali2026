"""Image validation and resizing (Pillow + pillow-heif)."""

from __future__ import annotations

import io
from dataclasses import dataclass

import pillow_heif
from PIL import Image, ImageOps, UnidentifiedImageError

pillow_heif.register_heif_opener()

# Phone cameras can exceed Pillow's default 89 MP "decompression bomb" threshold.
Image.MAX_IMAGE_PIXELS = 300_000_000

MEDIUM_EDGE = 1600
THUMB_EDGE = 400
MEDIUM_QUALITY = 84
THUMB_QUALITY = 78

# Pillow format name -> (file extension, mime type)
ALLOWED_FORMATS: dict[str, tuple[str, str]] = {
    "JPEG": ("jpg", "image/jpeg"),
    "MPO": ("jpg", "image/jpeg"),  # multi-picture JPEGs from some phones
    "PNG": ("png", "image/png"),
    "WEBP": ("webp", "image/webp"),
    "HEIF": ("heic", "image/heic"),
}


class InvalidImage(ValueError):
    """Raised when the uploaded bytes are not a supported image."""


@dataclass(frozen=True)
class ImageInfo:
    format: str
    extension: str
    mime: str
    width: int
    height: int


@dataclass(frozen=True)
class Variants:
    medium: bytes
    thumb: bytes
    width: int
    height: int


def inspect(data: bytes) -> ImageInfo:
    """Detect the real image type from the bytes, not the filename."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            fmt = (img.format or "").upper()
            if fmt not in ALLOWED_FORMATS:
                raise InvalidImage(f"Unsupported image format: {fmt or 'unknown'}")
            ext, mime = ALLOWED_FORMATS[fmt]
            return ImageInfo(fmt, ext, mime, img.width, img.height)
    except UnidentifiedImageError as exc:
        raise InvalidImage("File is not a recognised image") from exc
    except Image.DecompressionBombError as exc:
        raise InvalidImage("Image dimensions are too large") from exc


def _to_jpeg(img: Image.Image, edge: int, quality: int) -> bytes:
    out = img.copy()
    out.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    out.save(buf, format="JPEG", quality=quality, optimize=True, progressive=True)
    out.close()
    return buf.getvalue()


def make_variants(data: bytes) -> Variants:
    """Create medium (~1600 px) and thumbnail (~400 px) JPEGs, EXIF-rotated, sRGB."""
    try:
        with Image.open(io.BytesIO(data)) as img:
            # JPEG decoders can downscale while decoding, which saves a lot of RAM.
            if img.format in ("JPEG", "MPO"):
                img.draft("RGB", (MEDIUM_EDGE * 2, MEDIUM_EDGE * 2))
            img = ImageOps.exif_transpose(img) or img
            if img.mode not in ("RGB", "L"):
                # Flatten transparency onto white for PNG/WebP with alpha.
                if "A" in img.getbands():
                    bg = Image.new("RGB", img.size, (255, 255, 255))
                    bg.paste(img.convert("RGBA"), mask=img.convert("RGBA").getchannel("A"))
                    img = bg
                else:
                    img = img.convert("RGB")
            elif img.mode == "L":
                img = img.convert("RGB")
            width, height = img.size
            medium_bytes = _to_jpeg(img, MEDIUM_EDGE, MEDIUM_QUALITY)
            # Build the thumbnail from the medium image: cheaper than from the original.
            with Image.open(io.BytesIO(medium_bytes)) as medium_img:
                thumb_bytes = _to_jpeg(medium_img, THUMB_EDGE, THUMB_QUALITY)
            return Variants(medium=medium_bytes, thumb=thumb_bytes, width=width, height=height)
    except UnidentifiedImageError as exc:
        raise InvalidImage("File is not a recognised image") from exc
    except (OSError, ValueError) as exc:
        raise InvalidImage(f"Could not process image: {exc}") from exc
