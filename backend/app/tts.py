"""Interviewer voice: Kokoro-82M neural TTS (kokoro-onnx) on the local GPU, with CPU fallback.

- Lazy: nothing heavy is imported or loaded until the first synthesis (or an explicit warm-up).
- GPU first: CUDA execution provider capped at 1 GB of arena memory; if CUDA cannot start,
  the model loads on the CPU with 4 intra-op threads so it never takes the whole machine.
- If a GPU inference fails at runtime (e.g. out of memory), the session is rebuilt on the CPU
  and the request is retried once.
- One synthesis at a time (a lock), bounded input (600 characters), bounded queue wait.
- Model files live in backend/data/models/ (see scripts/download_tts_models.py). When they are
  missing the feature reports itself unavailable instead of failing.

Set TTS_DEVICE=cpu to skip the GPU.
"""

from __future__ import annotations

import importlib.util
import io
import logging
import os
import re
import threading
import time
import wave
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

MODELS_DIR = Path(__file__).resolve().parents[1] / "data" / "models"
MODEL_FILE = MODELS_DIR / "kokoro-v1.0.onnx"
VOICES_FILE = MODELS_DIR / "voices-v1.0.bin"

MAX_CHARS = 600
MIN_SPEED = 0.5
MAX_SPEED = 2.0
DEFAULT_VOICE = "af_heart"
SAMPLE_RATE = 24_000
GPU_MEM_LIMIT = 1024**3
CPU_INTRA_THREADS = 4
QUEUE_WAIT_S = 30.0
WARMUP_TEXT = "Hello."
# Each model run is limited to about this many characters (~12 s of speech) so GPU memory per run
# stays well inside GPU_MEM_LIMIT however long the request is. Pieces are joined with a short pause.
PIECE_CHARS = 200
PIECE_PAUSE_S = 0.22

# English voices worth hearing, best first within each group. Prefix: a = US English, b = UK English.
VOICES: dict[str, str] = {
    "af_heart": "Heart — US female",
    "af_bella": "Bella — US female",
    "af_sarah": "Sarah — US female",
    "af_kore": "Kore — US female",
    "af_aoede": "Aoede — US female",
    "af_nova": "Nova — US female",
    "am_michael": "Michael — US male",
    "am_fenrir": "Fenrir — US male",
    "am_puck": "Puck — US male",
    "am_echo": "Echo — US male",
    "bf_emma": "Emma — UK female",
    "bf_isabella": "Isabella — UK female",
    "bm_george": "George — UK male",
    "bm_fable": "Fable — UK male",
    "bm_lewis": "Lewis — UK male",
}


class TtsInputError(ValueError):
    """The request itself is wrong (empty, too long, unknown voice, bad speed)."""


class TtsUnavailable(RuntimeError):
    """The voice can't be produced right now (model missing, failed to load, busy)."""


def list_voices() -> list[dict[str, str]]:
    return [{"id": vid, "label": label} for vid, label in VOICES.items()]


def lang_for(voice: str) -> str:
    return "en-gb" if voice.startswith("b") else "en-us"


def validate(text: str, voice: str, speed: float) -> str:
    """Return the cleaned text or raise TtsInputError."""
    clean = " ".join((text or "").split())
    if not clean:
        raise TtsInputError("Text is empty.")
    if len(clean) > MAX_CHARS:
        raise TtsInputError(f"Text is too long ({len(clean)} characters; the limit is {MAX_CHARS}).")
    if voice not in VOICES:
        raise TtsInputError(f"Unknown voice '{voice}'.")
    if not MIN_SPEED <= float(speed) <= MAX_SPEED:
        raise TtsInputError(f"Speed must be between {MIN_SPEED} and {MAX_SPEED}.")
    return clean


_SENTENCE_END = re.compile(r"(?<=[.!?…][\"')\]])\s+|(?<=[.!?…])\s+")


def split_text(text: str, max_chars: int = PIECE_CHARS) -> list[str]:
    """Split at sentence ends (then commas, then spaces) into pieces of at most max_chars."""
    pieces: list[str] = []
    for sentence in _SENTENCE_END.split(text.strip()):
        rest = sentence.strip()
        while len(rest) > max_chars:
            window = rest[: max_chars + 1]
            cut = max(window.rfind(", "), window.rfind("; "), window.rfind(": "))
            if cut < max_chars // 3:
                cut = window.rfind(" ")
            end = cut + 1 if cut > 0 else max_chars
            pieces.append(rest[:end].strip())
            rest = rest[end:].strip()
        if rest:
            pieces.append(rest)
    merged: list[str] = []
    for piece in pieces:
        if merged and len(merged[-1]) + 1 + len(piece) <= max_chars:
            merged[-1] = f"{merged[-1]} {piece}"
        else:
            merged.append(piece)
    return merged


def to_wav(samples: Any, sample_rate: int = SAMPLE_RATE) -> bytes:
    """Mono float samples in [-1, 1] -> 16-bit PCM WAV bytes."""
    import numpy as np

    pcm = (np.clip(np.asarray(samples, dtype=np.float32).ravel(), -1.0, 1.0) * 32767.0).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(sample_rate)
        out.writeframes(pcm.tobytes())
    return buf.getvalue()


def _silence(seconds: float = 0.15) -> bytes:
    import numpy as np

    return to_wav(np.zeros(int(SAMPLE_RATE * seconds), dtype=np.float32))


def _missing() -> str | None:
    """Why TTS can't work at all, without importing anything heavy."""
    for module in ("onnxruntime", "kokoro_onnx", "numpy"):
        if importlib.util.find_spec(module) is None:
            return f"Python package '{module}' is not installed (run `uv sync` in backend/)."
    for path in (MODEL_FILE, VOICES_FILE):
        if not path.is_file():
            return f"Model file {path.name} is missing. Run `uv run python scripts/download_tts_models.py` in backend/."
    return None


class _ArenaShrinkingSession:
    """Wraps a CUDA InferenceSession so GPU arena memory not in use is released after every run.

    Between requests the process then holds only the model weights and CUDA context on the GPU.
    """

    def __init__(self, session: Any, run_options: Any) -> None:
        self._session = session
        self._run_options = run_options

    def run(self, output_names: Any, input_feed: Any, run_options: Any = None) -> Any:
        return self._session.run(output_names, input_feed, run_options or self._run_options)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._session, name)


class KokoroEngine:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._kokoro: Any = None
        self._device: str | None = None
        self._error: str | None = None
        self._failed = False
        self.load_seconds: float | None = None
        self.providers: list[str] = []

    # ---------- status ----------

    def status(self) -> dict[str, Any]:
        missing = _missing()
        return {
            "available": missing is None and not self._failed,
            "loaded": self._kokoro is not None,
            "device": self._device,
            "error": missing or self._error,
            "voices": list(VOICES),
        }

    # ---------- loading ----------

    def _session_options(self, ort: Any) -> Any:
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = CPU_INTRA_THREADS
        opts.inter_op_num_threads = 1
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.log_severity_level = 3
        return opts

    def _preload_cuda_libraries(self, ort: Any) -> None:
        """Load cudart/cuBLAS/cuFFT/cuDNN from the nvidia-* pip wheels; no system CUDA needed."""
        if hasattr(ort, "preload_dlls"):
            ort.preload_dlls(cuda=True, cudnn=True, msvc=True)
        if os.name != "nt":
            return
        import ctypes

        # cuDNN loads its sub-libraries by name at run time, and newer cuDNN 9 releases ship ones
        # that preload_dlls doesn't list (e.g. cudnn_engines_tensor_ir64_9.dll). Windows resolves a
        # by-name load to an already-loaded module, so load every cuDNN DLL by full path up front.
        for dll in sorted((Path(ort.__file__).resolve().parents[1] / "nvidia" / "cudnn" / "bin").glob("cudnn*64_9.dll")):
            ctypes.WinDLL(str(dll))

    def _cuda_session(self, ort: Any) -> Any:
        if "CUDAExecutionProvider" not in ort.get_available_providers():
            raise RuntimeError(f"this onnxruntime has no CUDA provider ({ort.get_available_providers()})")
        self._preload_cuda_libraries(ort)
        cuda = {
            "device_id": 0,
            "gpu_mem_limit": GPU_MEM_LIMIT,
            "arena_extend_strategy": "kSameAsRequested",
            "cudnn_conv_algo_search": "HEURISTIC",
        }
        session = ort.InferenceSession(
            str(MODEL_FILE),
            sess_options=self._session_options(ort),
            providers=[("CUDAExecutionProvider", cuda), "CPUExecutionProvider"],
        )
        if session.get_providers()[0] != "CUDAExecutionProvider":
            raise RuntimeError("CUDA provider failed to initialise; onnxruntime fell back to CPU")
        # onnxruntime would otherwise switch this session to its own default CPU setup on the first
        # GPU error without telling us; we want the error so we can rebuild with our CPU limits.
        session.disable_fallback()
        return session

    def _cpu_session(self, ort: Any) -> Any:
        return ort.InferenceSession(
            str(MODEL_FILE),
            sess_options=self._session_options(ort),
            providers=["CPUExecutionProvider"],
        )

    def _load(self, force_cpu: bool = False) -> None:
        """Build the session (GPU, else CPU) and warm it up. Caller holds the lock."""
        import onnxruntime as ort
        from kokoro_onnx import Kokoro

        started = time.perf_counter()
        ort.set_default_logger_severity(3)
        session = None
        self._error = None
        if not force_cpu and os.getenv("TTS_DEVICE", "").lower() != "cpu":
            try:
                session = self._cuda_session(ort)
                self._device = "cuda"
            except Exception as exc:
                self._error = f"GPU unavailable, using CPU: {exc}"
                log.warning("Kokoro TTS: %s", self._error)
                session = None
        if session is None:
            session = self._cpu_session(ort)
            self._device = "cpu"
        self.providers = list(session.get_providers())
        if self._device == "cuda":
            run_options = ort.RunOptions()
            run_options.add_run_config_entry("memory.enable_memory_arena_shrinkage", "gpu:0")
            session = _ArenaShrinkingSession(session, run_options)
        self._kokoro = Kokoro.from_session(session, str(VOICES_FILE))
        self._kokoro.create(WARMUP_TEXT, voice=DEFAULT_VOICE, speed=1.0, lang="en-us")
        self.load_seconds = time.perf_counter() - started
        log.info("Kokoro TTS loaded on %s in %.1fs (providers %s)", self._device, self.load_seconds, self.providers)

    def _ensure_loaded(self) -> None:
        if self._kokoro is not None:
            return
        missing = _missing()
        if missing:
            raise TtsUnavailable(missing)
        try:
            self._load()
        except Exception as exc:
            if self._device == "cuda":
                log.exception("Kokoro TTS failed on the GPU during warm-up; retrying on CPU")
                self._kokoro = None
                try:
                    self._load(force_cpu=True)
                    self._error = f"GPU failed during warm-up, using CPU: {exc}"
                    return
                except Exception as cpu_exc:
                    exc = cpu_exc
            self._kokoro = None
            self._device = None
            self._failed = True
            self._error = f"Kokoro TTS failed to load: {exc}"
            log.exception("Kokoro TTS failed to load")
            raise TtsUnavailable(self._error) from exc

    def _fall_back_to_cpu(self, exc: Exception) -> None:
        log.error("Kokoro TTS GPU inference failed (%s); rebuilding the session on CPU", exc)
        self._kokoro = None
        self._load(force_cpu=True)
        self._error = f"GPU inference failed, using CPU: {exc}"

    # ---------- synthesis ----------

    def warm_up(self) -> None:
        if not self._lock.acquire(timeout=QUEUE_WAIT_S):
            return
        try:
            self._ensure_loaded()
        except TtsUnavailable:
            pass
        finally:
            self._lock.release()

    def synthesize(self, text: str, voice: str = DEFAULT_VOICE, speed: float = 1.0) -> bytes:
        clean = validate(text, voice, speed)
        if not self._lock.acquire(timeout=QUEUE_WAIT_S):
            raise TtsUnavailable("The voice engine is busy. Try again in a moment.")
        try:
            self._ensure_loaded()
            try:
                audio = self._create(clean, voice, speed)
            except TtsInputError:
                raise
            except Exception as exc:
                if self._device != "cuda":
                    raise TtsUnavailable(f"Speech synthesis failed: {exc}") from exc
                try:
                    self._fall_back_to_cpu(exc)
                    audio = self._create(clean, voice, speed)
                except TtsInputError:
                    raise
                except Exception as cpu_exc:
                    raise TtsUnavailable(f"Speech synthesis failed: {cpu_exc}") from cpu_exc
            return audio
        finally:
            self._lock.release()

    def _create(self, text: str, voice: str, speed: float) -> bytes:
        import numpy as np

        if voice not in self._kokoro.voices:
            raise TtsInputError(f"Voice '{voice}' is not in the installed voice pack.")
        parts: list[Any] = []
        pause = np.zeros(int(SAMPLE_RATE * PIECE_PAUSE_S), dtype=np.float32)
        for piece in split_text(text):
            try:
                samples, _ = self._kokoro.create(piece, voice=voice, speed=float(speed), lang=lang_for(voice))
            except ValueError as exc:
                # Nothing pronounceable in this piece (e.g. only symbols): skip it.
                if "phoneme" in str(exc).lower() or "nothing to synthesize" in str(exc).lower():
                    continue
                raise TtsInputError(str(exc)) from exc
            if parts:
                parts.append(pause)
            parts.append(np.asarray(samples, dtype=np.float32))
        if not parts:
            return _silence()
        return to_wav(np.concatenate(parts), SAMPLE_RATE)


_engine = KokoroEngine()


def engine() -> KokoroEngine:
    return _engine


def tts_status() -> dict[str, Any]:
    """Cheap status for /api/health. Never loads the model."""
    return _engine.status()


def synthesize(text: str, voice: str = DEFAULT_VOICE, speed: float = 1.0) -> bytes:
    return _engine.synthesize(text, voice, speed)


_warmup_thread: threading.Thread | None = None


def warm_up_in_background() -> None:
    """Start loading the model without waiting (no-op if loaded, loading, or unavailable)."""
    global _warmup_thread
    if _engine.status()["loaded"] or _missing() is not None:
        return
    if _warmup_thread is not None and _warmup_thread.is_alive():
        return
    _warmup_thread = threading.Thread(target=_engine.warm_up, name="kokoro-warmup", daemon=True)
    _warmup_thread.start()
