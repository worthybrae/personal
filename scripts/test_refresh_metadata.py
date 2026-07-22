import io
import shutil
import subprocess

import pytest

from refresh_metadata import extract_art_bytes, thumbnail_jpeg, merge_meta

FFMPEG = shutil.which("ffmpeg")


def _make_png_bytes(size=(600, 400), color=(200, 50, 50)) -> bytes:
    from PIL import Image
    img = Image.new("RGB", size, color)
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


def test_thumbnail_jpeg_downsizes_and_returns_jpeg_bytes():
    png_bytes = _make_png_bytes(size=(600, 400))
    thumb = thumbnail_jpeg(png_bytes, max_edge=300)

    assert thumb[:2] == b"\xff\xd8"  # JPEG magic bytes

    from PIL import Image
    out_img = Image.open(io.BytesIO(thumb))
    assert out_img.format == "JPEG"
    assert max(out_img.size) <= 300
    # aspect ratio preserved (600x400 -> 300x200)
    assert out_img.size == (300, 200)


def test_thumbnail_jpeg_leaves_small_images_alone_but_still_reencodes():
    png_bytes = _make_png_bytes(size=(100, 50))
    thumb = thumbnail_jpeg(png_bytes, max_edge=300)
    assert thumb[:2] == b"\xff\xd8"
    from PIL import Image
    out_img = Image.open(io.BytesIO(thumb))
    assert out_img.size == (100, 50)


def test_merge_meta_preserves_existing_fields_and_adds_new_ones():
    entry = {"id": "abc123", "title": "Song", "duration_s": 12.3,
              "size_bytes": 4096, "ext": "mp3"}
    merged = merge_meta(entry, artist="Some Artist", album="Some Album", has_art=True)

    # existing fields preserved
    assert merged["id"] == "abc123"
    assert merged["title"] == "Song"
    assert merged["duration_s"] == 12.3
    assert merged["size_bytes"] == 4096
    assert merged["ext"] == "mp3"
    # new fields added
    assert merged["artist"] == "Some Artist"
    assert merged["album"] == "Some Album"
    assert merged["has_art"] is True
    # original entry untouched (pure function)
    assert "artist" not in entry


def test_merge_meta_overwrites_prior_artist_album_has_art():
    entry = {"id": "x", "artist": "Old", "album": "Old Album", "has_art": True}
    merged = merge_meta(entry, artist="New", album="New Album", has_art=False)
    assert merged["artist"] == "New"
    assert merged["album"] == "New Album"
    assert merged["has_art"] is False


@pytest.mark.skipif(FFMPEG is None, reason="ffmpeg not on PATH")
def test_extract_art_bytes_returns_none_for_tagless_mp3(tmp_path):
    path = tmp_path / "notags.mp3"
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-y",
         "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.1",
         "-codec:a", "libmp3lame", "-id3v2_version", "0", "-write_xing", "0",
         str(path)],
        check=True,
    )
    assert extract_art_bytes(path) is None


def test_extract_art_bytes_returns_none_for_unsupported_extension(tmp_path):
    path = tmp_path / "track.wav"
    path.write_bytes(b"not really a wav but extension is what matters here")
    assert extract_art_bytes(path) is None


def test_extract_art_bytes_returns_none_for_nonexistent_or_unreadable_file(tmp_path):
    # mp3 extension but garbage content -> mutagen.File raises/returns None,
    # extract_art_bytes must swallow it and return None, never raise.
    path = tmp_path / "broken.mp3"
    path.write_bytes(b"garbage, not a real mp3 file at all")
    assert extract_art_bytes(path) is None
