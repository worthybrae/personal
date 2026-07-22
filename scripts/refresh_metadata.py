"""Metadata + album-art refresh: local audio folder -> R2 catalog.json enrichment.

Scans a local library folder, computes each file's content-hash track id
(same `track_id()` as upload_music.py), matches it against tracks already
present in the R2 catalog, and for matched tracks:
  - reads easy-tag artist/album (fallback '')
  - extracts embedded art (mp3 ID3 APIC / m4a 'covr' atom)
  - downsizes art to a <=300px-max-edge JPEG (quality 80) via Pillow
  - uploads it to `art/{id}.jpg` (skipped if the catalog already has
    has_art=true for that id -- idempotent, safe to re-run)
  - merges artist/album/has_art into the catalog entry

The catalog is written once at the end, guarded the same way as
upload_music.py: only a missing catalog.json (NoSuchKey) is treated as
"start empty"; any other fetch error aborts rather than risk clobbering
the bucket's catalog, and if the final put_object fails the merged
catalog is saved locally to catalog.local.json instead of being lost.

Usage:
  python refresh_metadata.py --source ~/Music/unreleased [--dry-run]

Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
     (see backend/.env; load with `set -a && source ../backend/.env && set +a`
     before running for real -- this script does not read that file itself)

--dry-run scans the source folder and the existing R2 catalog, reports
match/unmatched counts and how many matched tracks would need art
uploaded, and exits without writing anything (read-only against R2 and
the local filesystem).
"""
import argparse
import io
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from upload_music import track_id, r2_client, fetch_existing_catalog

AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".aiff", ".aif"}


def easy_tags(path: Path) -> tuple[str, str]:
    """(artist, album) via mutagen easy tags; '' fallback for either/both."""
    try:
        import mutagen
        m = mutagen.File(path, easy=True)
        tags = m.tags if m is not None else None
        artist = str(tags.get("artist", [""])[0]) if tags and tags.get("artist") else ""
        album = str(tags.get("album", [""])[0]) if tags and tags.get("album") else ""
        return artist, album
    except Exception as e:
        print(f"  ! tag read failed for {path.name}: {e}", file=sys.stderr)
        return "", ""


def extract_art_bytes(path: Path) -> bytes | None:
    """Raw embedded art bytes, or None if the file has no usable art.

    mp3: first ID3 APIC frame (keys starting 'APIC'). m4a: the 'covr' atom.
    Any other extension (wav/aiff/etc.) has no embedded-art convention we
    support, so it's always None.
    """
    ext = path.suffix.lower()
    if ext not in (".mp3", ".m4a"):
        return None
    try:
        import mutagen
        m = mutagen.File(path)
        tags = m.tags if m is not None else None
        if not tags:
            return None
        if ext == ".mp3":
            apic_keys = [k for k in tags.keys() if k.startswith("APIC")]
            if not apic_keys:
                return None
            return bytes(tags[apic_keys[0]].data)
        else:  # .m4a
            covr = tags.get("covr")
            if not covr:
                return None
            return bytes(covr[0])
    except Exception as e:
        print(f"  ! art extraction failed for {path.name}: {e}", file=sys.stderr)
        return None


def thumbnail_jpeg(data: bytes, max_edge: int = 300) -> bytes:
    """Downsize image `data` to fit within max_edge x max_edge, re-encoded as JPEG q80."""
    from PIL import Image
    img = Image.open(io.BytesIO(data))
    img = img.convert("RGB")
    img.thumbnail((max_edge, max_edge), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="JPEG", quality=80)
    return out.getvalue()


def merge_meta(entry: dict, artist: str, album: str, has_art: bool) -> dict:
    """Return a new catalog entry dict with artist/album/has_art merged in.

    Existing fields on `entry` are preserved; artist/album/has_art are
    added or overwritten.
    """
    merged = dict(entry)
    merged["artist"] = artist
    merged["album"] = album
    merged["has_art"] = has_art
    return merged


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(p for p in args.source.rglob("*")
                   if p.is_file() and p.suffix.lower() in AUDIO_EXTS)
    print(f"found {len(files)} audio files under {args.source}")

    file_by_id: dict[str, Path] = {}
    for path in files:
        try:
            file_by_id[track_id(path)] = path
        except Exception as e:
            print(f"  ! hash failed for {path.name}: {e}", file=sys.stderr)

    # Catalog fetch is a read-only GET, so it happens for --dry-run too --
    # matching against the real catalog is the whole point of the report
    # (unmatched counts, how much art is missing). Only the write side
    # effects (art PUTs, catalog PUT) are gated on dry_run below.
    bucket = os.environ["R2_BUCKET"]
    client = r2_client()
    catalog = fetch_existing_catalog(client, bucket)
    tracks = catalog["tracks"]

    matched = 0
    unmatched = 0
    art_uploaded = 0
    art_skipped_existing = 0
    art_missing = 0

    for i, entry in enumerate(tracks):
        tid = entry["id"]
        path = file_by_id.get(tid)
        if path is None:
            unmatched += 1
            continue
        matched += 1
        try:
            artist, album = easy_tags(path)
            has_art = bool(entry.get("has_art"))
            if not has_art:
                art_bytes = extract_art_bytes(path)
                if art_bytes is not None:
                    if args.dry_run:
                        art_uploaded += 1  # "would upload"
                    else:
                        try:
                            thumb = thumbnail_jpeg(art_bytes)
                            client.put_object(
                                Bucket=bucket, Key=f"art/{tid}.jpg",
                                Body=thumb, ContentType="image/jpeg",
                            )
                            has_art = True
                            art_uploaded += 1
                        except Exception as e:
                            print(f"  ! art upload failed for {path.name}: {e}", file=sys.stderr)
                else:
                    art_missing += 1
            else:
                art_skipped_existing += 1
            if not args.dry_run:
                tracks[i] = merge_meta(entry, artist, album, has_art)
        except Exception as e:
            print(f"  ! refresh failed for {path.name}: {e}", file=sys.stderr)

    label = "dry run" if args.dry_run else "done"
    print(f"{label}: matched {matched} tracks ({unmatched} local files not in catalog), "
          f"{art_uploaded} art {'would be ' if args.dry_run else ''}uploaded, "
          f"{art_skipped_existing} already had art, {art_missing} had no embedded art")

    if args.dry_run:
        return 0

    catalog["generated_at"] = datetime.now(timezone.utc).isoformat()
    try:
        client.put_object(
            Bucket=bucket, Key="catalog.json",
            Body=json.dumps(catalog).encode(),
            ContentType="application/json",
        )
    except Exception as e:
        backup = Path(__file__).parent / "catalog.local.json"
        backup.write_text(json.dumps(catalog, indent=2))
        print(f"! catalog.json upload failed ({e}); merged catalog saved to {backup}.\n"
              f"! uploaded art is safe in the bucket -- fix connectivity and re-run "
              f"(or upload the backup as catalog.json manually).", file=sys.stderr)
        return 1
    print(f"done: catalog updated, {len(tracks)} tracks total")
    return 0


if __name__ == "__main__":
    sys.exit(main())
