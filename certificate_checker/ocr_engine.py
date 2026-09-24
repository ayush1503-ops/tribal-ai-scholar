"""Local OCR adapter: RapidOCR (OnnxRuntime) first, Tesseract fallback.

Engine priority
---------------
1. **RapidOCR** (``rapidocr_onnxruntime``) — a self-contained ONNX DBNet + CRNN
   text recogniser. It needs no system binary, so it works on Windows, macOS,
   Linux and inside the sandboxed preview without installing Tesseract.
2. **Tesseract** (``pytesseract``) — used when both the executable and its
   language data are available. Tesseract remains useful for multi-language
   runs (``eng+hin``).

Both engines run entirely locally. The best-scoring read across engines and
image variants wins, so the result is stronger than either engine alone.
"""
from __future__ import annotations

from dataclasses import dataclass
import os
import re
import shutil
from threading import Lock
from typing import Any

import numpy as np

try:
    import pytesseract
    from pytesseract import Output
except Exception:  # The adapter must stay importable without the binary.
    pytesseract = None
    Output = None

try:
    from rapidocr_onnxruntime import RapidOCR
except Exception:  # Optional dependency.
    RapidOCR = None

_rapid_instance: Any = None
_rapid_lock = Lock()


class OCRUnavailable(RuntimeError):
    """Raised when no OCR backend (RapidOCR or Tesseract) is usable."""


@dataclass(frozen=True)
class OCRResult:
    text: str
    confidence: float
    language: str
    word_count: int
    engine: str = "tesseract"

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "confidence": round(self.confidence, 1),
            "language": self.language,
            "word_count": self.word_count,
            "engine": self.engine,
        }


# --------------------------------------------------------------------------- #
# RapidOCR
# --------------------------------------------------------------------------- #
def _get_rapid() -> Any:
    global _rapid_instance
    if RapidOCR is None:
        raise OCRUnavailable(
            "RapidOCR is not installed. Run: pip install rapidocr-onnxruntime"
        )
    with _rapid_lock:
        if _rapid_instance is None:
            _rapid_instance = RapidOCR()
    return _rapid_instance


def rapid_available() -> bool:
    return RapidOCR is not None


def _as_bgr(image: np.ndarray) -> np.ndarray:
    if image.ndim == 2:
        return np.repeat(image[:, :, None], 3, axis=2)
    if image.ndim == 3 and image.shape[2] == 4:
        return image[:, :, :3]
    return image


def rapid_read(image: np.ndarray) -> OCRResult:
    """Optical character recognition with the bundled ONNX models."""
    engine = _get_rapid()
    result, _elapsed = engine(_as_bgr(image))
    if not result:
        return OCRResult(text="", confidence=0.0, language="auto", word_count=0, engine="rapidocr")

    boxes: list[tuple[float, float, str, float]] = []
    heights: list[float] = []
    for item in result:
        box, text, score = item
        try:
            text_value = str(text).strip()
            score_value = float(score)
        except (TypeError, ValueError):
            continue
        if not text_value:
            continue
        xs = [float(point[0]) for point in box]
        ys = [float(point[1]) for point in box]
        top, bottom = min(ys), max(ys)
        left = min(xs)
        heights.append(max(bottom - top, 1.0))
        boxes.append((top, left, text_value, score_value))

    if not boxes:
        return OCRResult(text="", confidence=0.0, language="auto", word_count=0, engine="rapidocr")

    median_height = float(np.median(heights))
    gap_tolerance = max(median_height * 0.55, 4.0)

    # Group recognised fragments into reading-order lines.
    ordered = sorted(boxes, key=lambda item: (item[0], item[1]))
    lines: list[list[tuple[float, float, str, float]]] = []
    for fragment in ordered:
        top, left, text_value, score_value = fragment
        if lines and (top - lines[-1][-1][0]) <= gap_tolerance:
            lines[-1].append(fragment)
        else:
            lines.append([fragment])

    joined_lines: list[str] = []
    for line in lines:
        line.sort(key=lambda item: item[1])  # left → right
        joined_lines.append(" ".join(item[2] for item in line))

    text = "\n".join(joined_lines).strip()
    confidences = [item[3] for item in boxes]
    confidence = sum(confidences) / len(confidences) * 100.0  # 0..100 scale
    return OCRResult(
        text=text,
        confidence=confidence,
        language="auto",
        word_count=sum(len(re.findall(r"\S+", line)) for line in joined_lines),
        engine="rapidocr",
    )


# --------------------------------------------------------------------------- #
# Tesseract
# --------------------------------------------------------------------------- #
def _configure_tesseract() -> str:
    if pytesseract is None:
        raise OCRUnavailable("pytesseract is not installed. Run: pip install -r requirements.txt")
    configured = os.environ.get("TESSERACT_CMD", "").strip()
    if configured:
        executable = configured
    else:
        executable = shutil.which("tesseract") or ""
    if not executable or not os.path.exists(executable):
        raise OCRUnavailable(
            "Tesseract OCR is not installed or not on PATH. See README.md setup instructions."
        )
    pytesseract.pytesseract.tesseract_cmd = executable
    return executable


def _tesseract_languages() -> list[str]:
    _configure_tesseract()
    try:
        return sorted(pytesseract.get_languages(config=""))
    except Exception:
        return []


def _choose_language() -> str:
    installed = set(_tesseract_languages())
    if "eng" not in installed:
        raise OCRUnavailable("Tesseract English data (eng) is required.")
    return "eng+hin" if "hin" in installed else "eng"


def _data_to_result(data: dict, language: str) -> OCRResult:
    lines: dict[tuple[int, int, int, int], list[str]] = {}
    accepted_confidences: list[float] = []
    words: list[str] = []

    count = len(data.get("text", []))
    for index in range(count):
        word = str(data["text"][index]).strip()
        try:
            confidence = float(data["conf"][index])
        except (TypeError, ValueError, KeyError):
            confidence = -1.0
        if not word or confidence < 0:
            continue
        words.append(word)
        accepted_confidences.append(confidence)
        key = (
            int(data.get("page_num", [1] * count)[index]),
            int(data.get("block_num", [0] * count)[index]),
            int(data.get("par_num", [0] * count)[index]),
            int(data.get("line_num", [0] * count)[index]),
        )
        lines.setdefault(key, []).append(word)

    text = "\n".join(" ".join(lines[key]) for key in sorted(lines))
    confidence = (
        sum(accepted_confidences) / len(accepted_confidences)
        if accepted_confidences
        else 0.0
    )
    return OCRResult(
        text=text.strip(),
        confidence=confidence,
        language=language,
        word_count=len(words),
        engine="tesseract",
    )


def tesseract_read(variants: list[np.ndarray]) -> OCRResult:
    """OCR up to two prepared variants with Tesseract."""
    language = _choose_language()
    candidates: list[OCRResult] = []
    for image in variants[:2]:
        try:
            data = pytesseract.image_to_data(
                image,
                lang=language,
                config="--oem 3 --psm 6 -c preserve_interword_spaces=1",
                output_type=Output.DICT,
                timeout=35,
            )
        except RuntimeError as exc:
            raise OCRUnavailable("OCR timed out or failed on this image. Try a clearer photo.") from exc
        candidates.append(_data_to_result(data, language))
        if candidates[-1].confidence >= 72 and candidates[-1].word_count >= 35:
            break
    if not candidates:
        return OCRResult(text="", confidence=0.0, language=language, word_count=0, engine="tesseract")
    return max(
        candidates,
        key=lambda item: item.confidence + min(item.word_count, 100) * 0.18,
    )


# --------------------------------------------------------------------------- #
# Public API
# --------------------------------------------------------------------------- #
def status() -> dict[str, Any]:
    """Return backend health without raising or exposing filesystem paths."""
    engines: dict[str, bool] = {"rapidocr": rapid_available(), "tesseract": False}
    languages: list[str] = []
    messages: list[str] = []

    if rapid_available():
        messages.append("RapidOCR (local ONNX) ready.")
    else:
        messages.append("RapidOCR not installed (pip install rapidocr-onnxruntime).")

    try:
        languages = _tesseract_languages()
        engines["tesseract"] = bool(languages)
        if languages:
            messages.append(f"Tesseract ready ({', '.join(languages)}).")
    except Exception:
        pass

    active = [name for name, ok in engines.items() if ok]
    return {
        "available": bool(active),
        "engines": engines,
        "active_engine": active[0] if active else None,
        "languages": ["hin"] if "hin" in languages else (languages or []),
        "message": (" ".join(messages) if messages else "No OCR engine available."),
    }


def read_text(variants: list[np.ndarray]) -> OCRResult:
    """OCR the supplied image variants with every available engine.

    RapidOCR runs first (no binary required); Tesseract is appended when its
    binary is present. The combined pick rewards confidence and real text
    coverage so a stronger engine transparently wins per document.
    """
    candidates: list[OCRResult] = []

    if rapid_available():
        for image in variants[:3]:
            candidates.append(rapid_read(image))
    else:
        try:
            tesseract_read(variants)
        except OCRUnavailable:
            pass  # Let the final availability check produce one clear error.

    if pytesseract is not None:
        try:
            candidates.append(tesseract_read(variants))
        except OCRUnavailable:
            pass

    if not candidates:
        raise OCRUnavailable(
            "No OCR engine is available. Install RapidOCR "
            "(pip install rapidocr-onnxruntime) or Tesseract (see README.md)."
        )

    best = max(
        candidates,
        key=lambda item: item.confidence + min(item.word_count, 100) * 0.18,
    )
    if best.word_count == 0 and rapid_available():
        # Prefer RapidOCR's empty-but-honest result over a low-coverage one.
        return best
    return best
