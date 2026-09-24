"""Command-line interface for processing an image without the web UI."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from certificate_checker.config import STATE_CONFIG
from certificate_checker.field_extractor import extract_fields
from certificate_checker.image_pipeline import InvalidImage, prepare_image
from certificate_checker.ocr_engine import OCRUnavailable, read_text
from certificate_checker.verifier import screen_certificate


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract fields from an SC/ST certificate image and prepare official-verification evidence."
    )
    parser.add_argument("image", type=Path, help="JPG, PNG, WEBP, BMP, or TIFF image")
    parser.add_argument("--state", choices=sorted(STATE_CONFIG), default="auto")
    parser.add_argument("--output", type=Path, help="Optional JSON report path")
    args = parser.parse_args()

    try:
        data = args.image.read_bytes()
        prepared = prepare_image(data)
        ocr = read_text(prepared.ocr_variants)
        fields = extract_fields(ocr.text)
        quality = prepared.quality.to_dict()
        verification = screen_certificate(
            fields=fields,
            raw_text=ocr.text,
            ocr_confidence=ocr.confidence,
            word_count=ocr.word_count,
            quality=quality,
            qr_values=prepared.qr_values,
            state_code=args.state,
        )
    except (OSError, InvalidImage, OCRUnavailable) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    report = {
        "fields": fields,
        "ocr": ocr.to_dict(),
        "quality": quality,
        "verification": verification,
        "processing": {"stored": False},
    }
    output = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(output + "\n", encoding="utf-8")
        print(f"Report written to {args.output}")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
