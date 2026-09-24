"""Local Tesseract OCR adapter with English/Hindi language fallback."""
from __future__ import annotations

from dataclasses import dataclass
import os
import shutil
from typing import Any

import numpy as np

try:
    import pytesseract
    from pytesseract import Output
except ImportError:  # A useful health response is preferable to an import crash.
    pytesseract = None
    Output = None


class OCRUnavailable(RuntimeError):
    """Raised when the local OCR executable or Python adapter is unavailable."""


@dataclass(frozen=True)
class OCRResult:
    text: str
    confidence: float
    language: str
    word_count: int

    def to_dict(self) -> dict:
        return {
            "text": self.text,
            "confidence": round(self.confidence, 1),
            "language": self.language,
            "word_count": self.word_count,
        }


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


def status() -> dict[str, Any]:
    """Return backend health without raising or exposing local filesystem paths."""
    try:
        _configure_tesseract()
        languages = sorted(pytesseract.get_languages(config=""))
        return {
            "available": True,
            "languages": languages,
            "message": "Local OCR is ready.",
        }
    except Exception as exc:  # Health endpoint must remain available.
        return {
            "available": False,
            "languages": [],
            "message": str(exc),
        }


def _choose_language() -> str:
    _configure_tesseract()
    installed = set(pytesseract.get_languages(config=""))
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
    )


def read_text(variants: list[np.ndarray]) -> OCRResult:
    """OCR up to two prepared variants and return the best-quality result."""
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
            # pytesseract raises RuntimeError for its timeout and some engine
            # errors. Keep the message user-safe and actionable.
            raise OCRUnavailable("OCR timed out or failed on this image. Try a clearer photo.") from exc
        candidates.append(_data_to_result(data, language))
        # Avoid a second expensive pass when the first read is already strong.
        if candidates[-1].confidence >= 72 and candidates[-1].word_count >= 35:
            break

    if not candidates:
        return OCRResult(text="", confidence=0.0, language=language, word_count=0)
    # Reward both confidence and useful text coverage, while preventing a long
    # stream of low-confidence noise from winning.
    return max(
        candidates,
        key=lambda item: item.confidence + min(item.word_count, 100) * 0.18,
    )
