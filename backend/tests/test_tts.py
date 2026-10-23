from __future__ import annotations

import io
import wave

import pytest

from app import tts


def _wav(data: bytes) -> wave.Wave_read:
    return wave.open(io.BytesIO(data), "rb")


def test_validate_cleans_whitespace():
    assert tts.validate("  Hello \n  there.  ", "af_heart", 1.0) == "Hello there."


@pytest.mark.parametrize("text", ["", "   ", "\n\t"])
def test_validate_rejects_empty(text):
    with pytest.raises(tts.TtsInputError):
        tts.validate(text, "af_heart", 1.0)


def test_validate_caps_length():
    tts.validate("a" * tts.MAX_CHARS, "af_heart", 1.0)
    with pytest.raises(tts.TtsInputError, match="too long"):
        tts.validate("a" * (tts.MAX_CHARS + 1), "af_heart", 1.0)


def test_validate_rejects_unknown_voice():
    with pytest.raises(tts.TtsInputError, match="Unknown voice"):
        tts.validate("Hello.", "zz_nobody", 1.0)


@pytest.mark.parametrize("speed", [0.2, 2.5])
def test_validate_rejects_bad_speed(speed):
    with pytest.raises(tts.TtsInputError):
        tts.validate("Hello.", "af_heart", speed)


def test_wav_header_is_16bit_mono_pcm():
    data = tts.to_wav([0.0, 0.5, -0.5, 1.0, -1.0, 2.0, -2.0], 24_000)
    assert data[:4] == b"RIFF" and data[8:16] == b"WAVEfmt "
    assert int.from_bytes(data[4:8], "little") == len(data) - 8
    with _wav(data) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()) == (1, 2, 24_000, 7)
        frames = w.readframes(7)
    values = [int.from_bytes(frames[i : i + 2], "little", signed=True) for i in range(0, 14, 2)]
    assert values == [0, 16383, -16383, 32767, -32767, 32767, -32767]


def test_voice_list_is_english_with_labels():
    voices = tts.list_voices()
    ids = [v["id"] for v in voices]
    assert ids[0] == tts.DEFAULT_VOICE == "af_heart"
    assert len(ids) == len(set(ids)) >= 8
    assert {"am_michael", "bf_emma", "bm_george"} <= set(ids)
    for v in voices:
        assert v["id"][0] in "ab" and v["id"][1] in "fm"
        assert v["label"].strip()
    assert tts.lang_for("bf_emma") == "en-gb" and tts.lang_for("af_heart") == "en-us"


def test_status_never_loads_the_model():
    engine = tts.KokoroEngine()
    status = engine.status()
    assert status["loaded"] is False and status["device"] is None
    assert status["voices"] == list(tts.VOICES)
    assert engine._kokoro is None


def test_missing_models_report_unavailable(monkeypatch, tmp_path):
    monkeypatch.setattr(tts, "MODEL_FILE", tmp_path / "kokoro-v1.0.onnx")
    monkeypatch.setattr(tts, "VOICES_FILE", tmp_path / "voices-v1.0.bin")
    engine = tts.KokoroEngine()
    status = engine.status()
    assert status["available"] is False
    assert "missing" in status["error"] or "not installed" in status["error"]
    with pytest.raises(tts.TtsUnavailable):
        engine.synthesize("Hello there.", "af_heart", 1.0)
    # Bad input is reported as such even when the model is missing.
    with pytest.raises(tts.TtsInputError):
        engine.synthesize("", "af_heart", 1.0)


def test_busy_engine_reports_unavailable(monkeypatch):
    monkeypatch.setattr(tts, "QUEUE_WAIT_S", 0.05)
    engine = tts.KokoroEngine()
    engine._lock.acquire()
    try:
        with pytest.raises(tts.TtsUnavailable, match="busy"):
            engine.synthesize("Hello.", "af_heart", 1.0)
    finally:
        engine._lock.release()


def test_split_text_keeps_pieces_small():
    text = "Hi. Okay, so tell me about yourself. " + "word " * 120 + "end."
    pieces = tts.split_text(text, max_chars=200)
    assert all(len(p) <= 200 for p in pieces)
    assert " ".join(pieces).split() == text.split()
    assert pieces[0].startswith("Hi. Okay, so tell me about yourself.")
    assert tts.split_text("Short one.") == ["Short one."]


class _FakeKokoro:
    def __init__(self, fail: bool) -> None:
        self.fail = fail
        self.calls = 0
        self.voices = dict.fromkeys(tts.VOICES)

    def create(self, text, voice, speed, lang):
        import numpy as np

        self.calls += 1
        if self.fail:
            raise RuntimeError("CUDA out of memory")
        return np.zeros(2400, dtype=np.float32), tts.SAMPLE_RATE


def test_gpu_failure_rebuilds_on_cpu_and_retries_once(monkeypatch):
    engine = tts.KokoroEngine()
    gpu, cpu = _FakeKokoro(fail=True), _FakeKokoro(fail=False)
    engine._kokoro, engine._device = gpu, "cuda"
    monkeypatch.setattr(tts, "_missing", lambda: None)

    def fake_load(force_cpu: bool = False) -> None:
        assert force_cpu
        engine._kokoro, engine._device = cpu, "cpu"

    monkeypatch.setattr(engine, "_load", fake_load)
    data = engine.synthesize("Hello there.", "af_heart", 1.0)
    with _wav(data) as w:
        assert w.getnframes() == 2400
    assert (gpu.calls, cpu.calls) == (1, 1)
    status = engine.status()
    assert status["device"] == "cpu" and "out of memory" in status["error"]


def test_cpu_failure_is_reported_not_retried(monkeypatch):
    engine = tts.KokoroEngine()
    broken = _FakeKokoro(fail=True)
    engine._kokoro, engine._device = broken, "cpu"
    monkeypatch.setattr(tts, "_missing", lambda: None)
    with pytest.raises(tts.TtsUnavailable):
        engine.synthesize("Hello there.", "af_heart", 1.0)
    assert broken.calls == 1


needs_model = pytest.mark.skipif(tts._missing() is not None, reason="Kokoro packages or model files not installed")


@needs_model
def test_real_synthesis_produces_speech():
    data = tts.synthesize("Thanks for joining. Tell me about a project you're proud of.", "af_heart", 1.0)
    with _wav(data) as w:
        assert (w.getnchannels(), w.getsampwidth(), w.getframerate()) == (1, 2, tts.SAMPLE_RATE)
        seconds = w.getnframes() / w.getframerate()
    assert 1.5 < seconds < 15
    status = tts.tts_status()
    assert status["loaded"] is True and status["device"] in ("cuda", "cpu")


@needs_model
def test_real_synthesis_symbols_only_is_silence():
    data = tts.synthesize("…", "bm_george", 1.0)
    with _wav(data) as w:
        assert w.getnframes() > 0
