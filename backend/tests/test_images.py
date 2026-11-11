import io

import pytest
from PIL import Image

from app.images import InvalidImage, inspect, make_variants
from tests.conftest import make_heic, make_jpeg


def test_inspect_jpeg():
    info = inspect(make_jpeg())
    assert info.format == "JPEG" and info.extension == "jpg" and info.mime == "image/jpeg"
    assert (info.width, info.height) == (2400, 1600)


def test_inspect_heic():
    info = inspect(make_heic())
    assert info.format == "HEIF" and info.extension == "heic"


def test_inspect_rejects_non_image():
    with pytest.raises(InvalidImage):
        inspect(b"GIF89a this is not really an image" * 10)
    with pytest.raises(InvalidImage):
        inspect(b"%PDF-1.4 not an image")


def test_variants_sizes_and_format():
    v = make_variants(make_jpeg(4000, 3000))
    with Image.open(io.BytesIO(v.medium)) as m:
        assert m.format == "JPEG" and max(m.size) == 1600
    with Image.open(io.BytesIO(v.thumb)) as t:
        assert t.format == "JPEG" and max(t.size) == 400
    assert len(v.thumb) < len(v.medium)


def test_variants_from_heic_and_png_alpha():
    v = make_variants(make_heic())
    with Image.open(io.BytesIO(v.medium)) as m:
        assert m.format == "JPEG" and m.size == (1067, 1600)

    png = Image.new("RGBA", (800, 600), (255, 0, 0, 128))
    buf = io.BytesIO()
    png.save(buf, format="PNG")
    v2 = make_variants(buf.getvalue())
    with Image.open(io.BytesIO(v2.medium)) as m:
        assert m.mode == "RGB" and m.size == (800, 600)


def test_exif_orientation_is_applied():
    img = Image.new("RGB", (600, 300), (10, 20, 30))
    exif = Image.Exif()
    exif[0x0112] = 6  # rotate 90 CW
    buf = io.BytesIO()
    img.save(buf, format="JPEG", exif=exif)
    v = make_variants(buf.getvalue())
    with Image.open(io.BytesIO(v.medium)) as m:
        assert m.size == (300, 600)
