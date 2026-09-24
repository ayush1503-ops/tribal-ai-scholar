"""Command-line interface for processing an image or scanned PDF without the web UI."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

from certificate_checker.config import STATE_CONFIG
from certificate_checker.field_extractor import extract_fields
from certificate_checker.image_pipeline import InvalidImage, prepare_image
from certificate_checker.ocr_engine import OCRUnavailable, read_text
from certificate_checker.pdf_pipeline import (
    InvalidPdf,
    PdfUnavailable,
    export_pdf,
    is_pdf_filename,
    process_page,
    render_pages,
)
from certificate_checker.verifier import merge_screenings, screen_certificate


def _process_image(data: bytes, state_code: str, filename: str | None) -> dict:
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
        state_code=state_code,
        image_bytes=data,
        source_type="image",
    )
    return {
        "fields": fields,
        "ocr": ocr.to_dict(),
        "quality": quality,
        "verification": verification,
        "processing": {"stored": False, "method": "Local OpenCV + local OCR"},
    }


def _process_pdf(data: bytes, state_code: str, filename: str | None, export: Path | None) -> dict:
    from certificate_checker.image_pipeline import build_ocr_variants
    import cv2

    pages = render_pages(data, max_pages=20)
    per_page: list[dict] = []
    page_images: list = []
    for page in pages:
        document, quality = process_page(page["image"])
        ocr = read_text(build_ocr_variants(document))
        ok, encoded = cv2.imencode(".jpg", document, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        jpg = encoded.tobytes() if ok else None
        verification = screen_certificate(
            fields=extract_fields(ocr.text),
            raw_text=ocr.text,
            ocr_confidence=ocr.confidence,
            word_count=ocr.word_count,
            quality=quality.to_dict(),
            qr_values=[],
            state_code=state_code,
            image_bytes=jpg,
            source_type="pdf",
            page=page["index"] + 1,
            page_label=page["label"],
        )
        per_page.append({
            "page": page["index"] + 1,
            "page_label": page["label"],
            "fields": extract_fields(ocr.text),
            "ocr": ocr.to_dict(),
            "quality": quality.to_dict(),
            "verification": verification,
        })
        page_images.append(document)

    if export:
        export.write_bytes(export_pdf(page_images))
        print(f"Searchable PDF written to {export}")

    verification = merge_screenings([p["verification"] for p in per_page])
    merged_fields: dict[str, dict] = {}
    for p in per_page:
        for key, field in p["fields"].items():
            if field.get("value") and key not in merged_fields:
                merged_fields[key] = field
    for p in per_page:
        for key, field in p["fields"].items():
            merged_fields.setdefault(key, field)

    return {
        "fields": merged_fields,
        "ocr": per_page[0]["ocr"] if per_page else {},
        "pages": per_page,
        "verification": verification,
        "processing": {"stored": False, "method": "Local OpenCV + local OCR + PDF rendering"},
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Extract fields from an SC/ST certificate (image or PDF) and prepare official-verification evidence."
    )
    parser.add_argument("file", type=Path, help="JPG, PNG, WEBP, BMP, TIFF image, or a scanned PDF")
    parser.add_argument("--state", choices=sorted(STATE_CONFIG), default="auto")
    parser.add_argument("--output", type=Path, help="Optional JSON report path")
    parser.add_argument("--export-pdf", type=Path, help="Optional path to write a flattened PDF of the scanned pages")
    args = parser.parse_args()

    try:
        data = args.file.read_bytes()
        if is_pdf_filename(args.file.name):
            report = _process_pdf(data, args.state, args.file.name, args.export_pdf)
        elif args.export_pdf:
            print("Error: --export-pdf is only valid for PDF input.", file=sys.stderr)
            return 1
        else:
            report = _process_image(data, args.state, args.file.name)
    except (OSError, InvalidImage, InvalidPdf, PdfUnavailable, OCRUnavailable) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    output = json.dumps(report, ensure_ascii=False, indent=2)
    if args.output:
        args.output.write_text(output + "\n", encoding="utf-8")
        print(f"Report written to {args.output}")
    else:
        print(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
