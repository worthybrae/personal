from pathlib import Path

from upload_music import needs_transcode, track_id, title_from_tags, build_actions


def test_needs_transcode_by_extension(tmp_path):
    assert needs_transcode(Path("a.wav")) is True
    assert needs_transcode(Path("a.AIFF")) is True
    assert needs_transcode(Path("a.aif")) is True
    assert needs_transcode(Path("a.mp3")) is False
    assert needs_transcode(Path("a.m4a")) is False


def test_track_id_is_stable_and_content_addressed(tmp_path):
    f1 = tmp_path / "one.mp3"
    f1.write_bytes(b"hello audio")
    f2 = tmp_path / "two.mp3"
    f2.write_bytes(b"hello audio")
    f3 = tmp_path / "three.mp3"
    f3.write_bytes(b"different")
    assert track_id(f1) == track_id(f2)      # content-addressed
    assert track_id(f1) != track_id(f3)
    assert len(track_id(f1)) == 16
    assert track_id(f1) == track_id(f1)      # stable across calls


def test_title_from_tags_prefers_tag_then_filename():
    assert title_from_tags({"title": ["Real Title"]}, "fallback") == "Real Title"
    assert title_from_tags({"title": []}, "fallback") == "fallback"
    assert title_from_tags({}, "fallback") == "fallback"
    assert title_from_tags(None, "fallback") == "fallback"


def test_build_actions_skips_existing_ids(tmp_path):
    a = tmp_path / "a.mp3"
    a.write_bytes(b"aaa")
    b = tmp_path / "b.wav"
    b.write_bytes(b"bbb")
    existing = {track_id(a)}
    actions = build_actions([a, b], existing)
    assert len(actions) == 1
    assert actions[0]["path"] == b
    assert actions[0]["id"] == track_id(b)
    assert actions[0]["transcode"] is True
    assert actions[0]["ext"] == "mp3"  # wav uploads as transcoded mp3


def test_build_actions_dedupes_identical_content(tmp_path):
    a = tmp_path / "a.mp3"
    a.write_bytes(b"same")
    b = tmp_path / "copy of a.mp3"
    b.write_bytes(b"same")
    actions = build_actions([a, b], set())
    assert len(actions) == 1
