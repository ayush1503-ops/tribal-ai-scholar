"""PDF support: render pages to images for OpenCV, OCR them, export PDF reports.

This module keeps the privacy model intact: uploaded bytes are decoded in
memory and any intermediate files are written to a temporary directory that is
removed as soon as processing finishes.
"""
from __future__ import annotations

from dataclasses import dataclass
from io import BytesIO
import glob
import os
import shutil
import tempfile

import numpy as np

from .image_pipeline import decode_image, detect_document, measure_quality

PDF_EXTENSIONS = {".pdf"}


@dataclass
class PdfPage:
    index: int
    image: np.ndarray
    width: int
    height: int


class PdfUnavailable(RuntimeError):
    """Raised when PDF handling libraries or the PDF itself are unusable."""


class InvalidPdf(ValueError):
    """Raised when the uploaded bytes are not an acceptable PDF."""


def is_pdf_filename(filename: str | None) -> bool:
    if not filename:
        return False
    return filename.lower().endswith(tuple(PDF_EXTENSIONS))


def _open_pdf(data: bytes):
    """Open a QPDF document with PyMuPDF, translating decode failures cleanly."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise PdfUnavailable(
            "PDF support is not installed. Run: pip install PyMuPDF"
        )

    try:
        doc = fitz.open(stream=data, filetype="pdf")
        if getattr(doc, "is_pdf", False):
            return doc
        try:
            doc.close()
        except Exception:
            pass
        raise InvalidPdf("The uploaded file is not a valid PDF document.")
    except InvalidPdf:
        raise
    except Exception as exc:
        raise InvalidPdf("The uploaded file could not be read as a PDF.") from exc


def page_labels(doc) -> list[str]:
    """Return a display label for each page (copes with page labels/roman numerals)."""
    labels: list[str] = []
    for index in range(len(doc)):
        try:
            labels.append(doc.get_page_labels()[index] or str(index + 1))
        except Exception:
            labels.append(str(index + 1))
    return labels


def render_pages(data: bytes, max_pages: int = 20, dpi: int = 200) -> list[dict]:
    """Render a PDF into per-page images (BGR numpy arrays) plus metadata."""
    doc = _open_pdf(data)
    try:
        count = min(len(doc), max_pages)
        if count == 0:
            raise InvalidPdf("The PDF contains no pages.")
        labels = page_labels(doc)
        pages: list[dict] = []
        for index in range(count):
            page = doc[index]
            try:
                pixmap = page.get_pixmap(dpi=dpi, alpha=False)
            except Exception:
                pixmap = page.get_pixmap(alpha=False)
            width, height = pixmap.width, pixmap.height
            samples = np.frombuffer(pixmap.samples, dtype=np.uint8)
            channels = pixmap.n
            if channels >= 3:
                rgb = samples.reshape(height, width, channels)[:, :, :3]
            else:
                gray = samples.reshape(height, width)
                rgb = np.repeat(gray[:, :, None], 3, axis=2)
            # RGB -> BGR for OpenCV.
            pages.append({
                "index": index,
                "label": labels[index] if index < len(labels) else str(index + 1),
                "image": rgb[:, :, ::-1].copy(),
                "width": width,
                "height": height,
            })
        return pages
    finally:
        try:
            doc.close()
        except Exception:
            pass


def process_page(page_image: np.ndarray):
    """Run the same document detection + quality steps used for photos."""
    document, detected = detect_document(page_image)
    quality = measure_quality(document, detected)
    return document, quality


# --------------------------------------------------------------------------- #
# PDF report generation (img2pdf preferred, reportlab fallback)
# --------------------------------------------------------------------------- #
def _img2pdf_from_images(images: list[np.ndarray]) -> bytes:
    import cv2
    import img2pdf

    buffers: list[BytesIO] = []
    for image in images:
        buffer = BytesIO()
        ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        if not ok:
            continue
        buffer.write(encoded.tobytes())
        buffer.seek(0)
        buffers.append(buffer)
    if not buffers:
        raise ValueError("No readable pages to export.")
    return img2pdf.convert([b.getvalue() for b in buffers])


def _render_page_jpeg(image: np.ndarray) -> BytesIO:
    import cv2
    buffer = BytesIO()
    cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 88])[1].tofile(buffer)
    buffer.seek(0)
    return buffer


def _reportlab_pdf(images: list[np.ndarray]) -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas as rl_canvas

    buffer = BytesIO()
    canvas = rl_canvas.Canvas(buffer, pagesize=A4)
    page_w, page_h = A4
    for index, image in enumerate(images, start=1):
        canvas.setFont("Helvetica-Bold", 10)
        canvas.drawString(36, page_h - 24, f"Certificate scan page {index}")
        reader = ImageReader(_render_page_jpeg(image))
        iw, ih = reader.getSize()
        available_w = page_w - 72
        available_h = page_h - 72
        scale = min(available_w / iw, available_h / ih, 1.0)
        draw_w, draw_h = iw * scale, ih * scale
        x = (page_w - draw_w) / 2
        y = page_h - 36 - draw_h
        canvas.drawImage(reader, x, y, draw_w, draw_h, preserveAspectRatio=True)
        canvas.showPage()
    canvas.save()
    data = buffer.getvalue()
    buffer.close()
    return data


def export_pdf(images: list[np.ndarray]) -> bytes:
    """Turn processed page images into a single PDF. Never writes to disk."""
    if not images:
        raise ValueError("No pages to export.")
    try:
        return _img2pdf_from_images(images)
    except Exception:
        return _reportlab_pdf(images)
