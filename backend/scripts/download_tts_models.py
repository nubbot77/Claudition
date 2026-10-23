"""Download the Kokoro TTS model files into backend/data/models/.

Run from backend/:  uv run python scripts/download_tts_models.py [--workers N]

Files come from the official kokoro-onnx GitHub release `model-files-v1.0`
(kokoro-v1.0.onnx ~325 MB, voices-v1.0.bin ~28 MB). A file already present with the
expected size is skipped. Each file is downloaded into a `.part` file (in parallel byte
ranges when the server supports them, which helps on throttled connections) and renamed
into place only when complete, so an interrupted download never leaves a truncated model.
"""

from __future__ import annotations

import argparse
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RELEASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
MODELS_DIR = Path(__file__).resolve().parents[1] / "data" / "models"
FILES = {"kokoro-v1.0.onnx": 325_532_387, "voices-v1.0.bin": 28_214_398}
SEGMENT = 4 * 1024 * 1024
CHUNK = 64 * 1024
RETRIES = 20
UA = {"User-Agent": "interview-platform-tts"}


def _mb(n: int) -> str:
    return f"{n / 1_000_000:.1f} MB"


def resolve(url: str) -> tuple[str, int | None, bool]:
    """Follow redirects; return (final url, size, supports byte ranges)."""
    req = urllib.request.Request(url, headers={**UA, "Range": "bytes=0-0"})
    with urllib.request.urlopen(req, timeout=60) as res:
        final = res.geturl()
        if res.status == 206:
            total = res.headers.get("Content-Range", "").rpartition("/")[2]
            return final, int(total) if total.isdigit() else None, True
        length = res.headers.get("Content-Length")
        return final, int(length) if length else None, False


class Progress:
    def __init__(self, name: str, total: int) -> None:
        self.name, self.total, self.done = name, total, 0
        self.lock = threading.Lock()
        self.last = 0.0
        self.started = time.monotonic()

    def add(self, n: int) -> None:
        with self.lock:
            self.done += n
            now = time.monotonic()
            if now - self.last >= 5:
                self.last = now
                rate = self.done / max(now - self.started, 1e-6)
                print(f"  {self.name}: {_mb(self.done)} / {_mb(self.total)} ({rate / 1000:.0f} kB/s)", flush=True)


def fetch_range(url: str, tmp: Path, start: int, end: int, progress: Progress) -> None:
    """Fetch bytes start..end into tmp, resuming from the last byte written after a failure."""
    pos = start
    for attempt in range(1, RETRIES + 1):
        try:
            req = urllib.request.Request(url, headers={**UA, "Range": f"bytes={pos}-{end}"})
            with urllib.request.urlopen(req, timeout=60) as res, tmp.open("r+b") as out:
                if res.status != 206:
                    raise RuntimeError(f"server ignored range request (HTTP {res.status})")
                out.seek(pos)
                while pos <= end:
                    chunk = res.read(min(CHUNK, end - pos + 1))
                    if not chunk:
                        break
                    out.write(chunk)
                    pos += len(chunk)
                    progress.add(len(chunk))
            if pos == end + 1:
                return
            raise RuntimeError(f"short read at byte {pos}")
        except Exception as exc:
            if attempt == RETRIES:
                raise RuntimeError(f"bytes {start}-{end}: {exc}") from exc
            time.sleep(2 * attempt)


def fetch_whole(url: str, tmp: Path, progress: Progress) -> None:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as res, tmp.open("wb") as out:
        while chunk := res.read(CHUNK):
            out.write(chunk)
            progress.add(len(chunk))


def download(name: str, expected: int, workers: int) -> int:
    dest = MODELS_DIR / name
    if dest.exists() and dest.stat().st_size == expected:
        print(f"skip  {name}: already present ({_mb(expected)})")
        return 0

    # Range requests go to the release URL each time: GitHub redirects to a signed CDN URL
    # that expires after about an hour, which a slow download can outlive.
    url = f"{RELEASE}/{name}"
    _, size, ranged = resolve(url)
    if size is not None and size != expected:
        raise RuntimeError(f"{name}: release reports {size} bytes, expected {expected}")
    tmp = dest.with_name(dest.name + ".part")
    progress = Progress(name, expected)
    started = time.monotonic()

    if ranged and workers > 1:
        with tmp.open("wb") as out:
            out.truncate(expected)
        ranges = [(s, min(s + SEGMENT, expected) - 1) for s in range(0, expected, SEGMENT)]
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for future in [pool.submit(fetch_range, url, tmp, s, e, progress) for s, e in ranges]:
                future.result()
    else:
        fetch_whole(url, tmp, progress)

    written = tmp.stat().st_size
    if written != expected:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"{name}: expected {expected} bytes, got {written}")
    tmp.replace(dest)
    elapsed = time.monotonic() - started
    print(f"done  {name}: {_mb(written)} in {elapsed:.0f}s")
    return written


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--workers", type=int, default=12, help="parallel byte-range connections per file")
    args = parser.parse_args()

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    total = 0
    try:
        for name, expected in FILES.items():
            total += download(name, expected, max(1, args.workers))
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"downloaded {_mb(total)} into {MODELS_DIR}")
    for name in FILES:
        print(f"  {name}: {_mb((MODELS_DIR / name).stat().st_size)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
