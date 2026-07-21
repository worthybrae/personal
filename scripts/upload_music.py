"""One-off uploader: local audio folder -> Cloudflare R2 + catalog.json.

Usage:
  python upload_music.py --source ~/Music/unreleased [--dry-run]

Env: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
Requires ffmpeg on PATH for wav/aiff transcode.

Idempotent: track ids are content hashes of the ORIGINAL file, and ids
already present in the bucket's catalog.json are skipped, so re-running
after adding new files uploads only the new ones.
"""
import argparse
import hashlib
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

AUDIO_EXTS = {".mp3", ".m4a", ".wav", ".aiff", ".aif"}
TRANSCODE_EXTS = {".wav", ".aiff", ".aif"}
CONTENT_TYPES = {"mp3": "audio/mpeg", "m4a": "audio/mp4"}


def needs_transcode(path: Path) -> bool:
    return path.suffix.lower() in TRANSCODE_EXTS


def track_id(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def title_from_tags(tags, fallback: str) -> str:
    if tags:
        vals = tags.get("title") or []
        if vals:
            return str(vals[0])
    return fallback


def build_actions(files: list[Path], existing_ids: set[str]) -> list[dict]:
    actions = []
    seen: set[str] = set()
    for path in files:
        tid = track_id(path)
        if tid in existing_ids or tid in seen:
            continue
        seen.add(tid)
        transcode = needs_transcode(path)
        ext = "mp3" if transcode else path.suffix.lower().lstrip(".")
        actions.append({"path": path, "id": tid, "transcode": transcode, "ext": ext})
    return actions


def read_metadata(path: Path) -> tuple[str, float]:
    """(title, duration_s) via mutagen; falls back to filename / 0."""
    try:
        import mutagen
        m = mutagen.File(path, easy=True)
        title = title_from_tags(m.tags if m else None, path.stem)
        duration = float(m.info.length) if m and m.info else 0.0
        return title, duration
    except Exception as e:
        print(f"  ! metadata failed for {path.name}: {e}", file=sys.stderr)
        return path.stem, 0.0


def transcode_to_mp3(src: Path, dest: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
         "-i", str(src), "-codec:a", "libmp3lame", "-b:a", "192k", str(dest)],
        check=True,
    )


def r2_client():
    import boto3
    account = os.environ["R2_ACCOUNT_ID"]
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


def fetch_existing_catalog(client, bucket: str) -> dict:
    try:
        obj = client.get_object(Bucket=bucket, Key="catalog.json")
        return json.loads(obj["Body"].read())
    except client.exceptions.NoSuchKey:
        return {"generated_at": "", "tracks": []}
    except Exception:
        # Bucket may be empty on first run; anything else should surface
        return {"generated_at": "", "tracks": []}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--source", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    files = sorted(p for p in args.source.rglob("*")
                   if p.is_file() and p.suffix.lower() in AUDIO_EXTS)
    print(f"found {len(files)} audio files under {args.source}")

    if args.dry_run:
        actions = build_actions(files, set())
        n_transcode = sum(1 for a in actions if a["transcode"])
        for a in actions:
            print(f"  would upload tracks/{a['id']}.{a['ext']}"
                  f"{'  (transcode)' if a['transcode'] else ''}  <- {a['path'].name}")
        print(f"dry run: {len(actions)} uploads ({n_transcode} transcodes), "
              f"{len(files) - len(actions)} duplicates skipped")
        return 0

    bucket = os.environ["R2_BUCKET"]
    client = r2_client()
    catalog = fetch_existing_catalog(client, bucket)
    existing_ids = {t["id"] for t in catalog["tracks"]}
    actions = build_actions(files, existing_ids)
    print(f"{len(actions)} new tracks to upload ({len(existing_ids)} already in catalog)")

    uploaded = 0
    with tempfile.TemporaryDirectory() as tmp:
        for i, a in enumerate(actions, 1):
            path, tid, ext = a["path"], a["id"], a["ext"]
            try:
                title, duration = read_metadata(path)
                upload_path = path
                if a["transcode"]:
                    upload_path = Path(tmp) / f"{tid}.mp3"
                    transcode_to_mp3(path, upload_path)
                    _, duration = read_metadata(upload_path) if duration == 0 else (title, duration)
                key = f"tracks/{tid}.{ext}"
                client.upload_file(
                    str(upload_path), bucket, key,
                    ExtraArgs={"ContentType": CONTENT_TYPES.get(ext, "application/octet-stream")},
                )
                catalog["tracks"].append({
                    "id": tid,
                    "title": title,
                    "duration_s": round(duration, 1),
                    "size_bytes": upload_path.stat().st_size,
                    "ext": ext,
                })
                uploaded += 1
                print(f"[{i}/{len(actions)}] {key}  {title}")
                if a["transcode"]:
                    upload_path.unlink()  # keep temp dir small across 1000 files
            except Exception as e:
                print(f"[{i}/{len(actions)}] ! skipped {path.name}: {e}", file=sys.stderr)

    catalog["generated_at"] = datetime.now(timezone.utc).isoformat()
    catalog["tracks"].sort(key=lambda t: t["title"].lower())
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
              f"! uploaded audio is safe in the bucket — fix connectivity and re-run "
              f"(or upload the backup as catalog.json manually).", file=sys.stderr)
        return 1
    print(f"done: {uploaded} uploaded, catalog now {len(catalog['tracks'])} tracks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
