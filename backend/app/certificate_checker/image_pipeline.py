"""OpenCV document detection, cleanup, quality checks, and QR decoding."""
from __future__ import annotations

from dataclasses import dataclass, asdict
from io import BytesIO
from typing import Iterable

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_PIXELS = 25_000_000
MAX_WORKING_EDGE = 2400


class InvalidImage(ValueError):
    """Raised when uploaded bytes are not a safe, decodable image."""


@dataclass(frozen=True)
class ImageQuality:
    width: int
    height: int
    blur_variance: float
    brightness: float
    glare_percent: float
    dark_percent: float
    document_detected: bool

    def to_dict(self) -> dict:
        data = asdict(self)
        data["blur_variance"] = round(self.blur_variance, 1)
        data["brightness"] = round(self.brightness, 1)
        data["glare_percent"] = round(self.glare_percent, 2)
        data["dark_percent"] = round(self.dark_percent, 2)
        return data


@dataclass
class PreparedImage:
    original: np.ndarray
    document: np.ndarray
    ocr_variants: list[np.ndarray]
    qr_values: list[str]
    quality: ImageQuality


def decode_image(data: bytes) -> np.ndarray:
    """Decode an image, apply EXIF orientation, and return BGR pixels."""
    if not data:
        raise InvalidImage("The image is empty.")
    try:
        with Image.open(BytesIO(data)) as opened:
            if opened.width * opened.height > MAX_IMAGE_PIXELS:
                raise InvalidImage("Image is too large (maximum 25 megapixels).")
            image = ImageOps.exif_transpose(opened).convert("RGB")
            rgb = np.asarray(image)
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        if isinstance(exc, InvalidImage):
            raise
        raise InvalidImage("The uploaded file is not a supported image.") from exc
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)


def resize_for_processing(image: np.ndarray, max_edge: int = MAX_WORKING_EDGE) -> np.ndarray:
    height, width = image.shape[:2]
    longest = max(height, width)
    if longest <= max_edge:
        return image.copy()
    scale = max_edge / float(longest)
    return cv2.resize(
        image,
        (max(1, int(width * scale)), max(1, int(height * scale))),
        interpolation=cv2.INTER_AREA,
    )


def _order_points(points: np.ndarray) -> np.ndarray:
    pts = points.reshape(4, 2).astype("float32")
    ordered = np.zeros((4, 2), dtype="float32")
    sums = pts.sum(axis=1)
    differences = np.diff(pts, axis=1).reshape(-1)
    ordered[0] = pts[np.argmin(sums)]       # top-left
    ordered[2] = pts[np.argmax(sums)]       # bottom-right
    ordered[1] = pts[np.argmin(differences)]  # top-right
    ordered[3] = pts[np.argmax(differences)]  # bottom-left
    return ordered


def _perspective_transform(image: np.ndarray, points: np.ndarray) -> np.ndarray:
    top_left, top_right, bottom_right, bottom_left = _order_points(points)
    width_a = np.linalg.norm(bottom_right - bottom_left)
    width_b = np.linalg.norm(top_right - top_left)
    height_a = np.linalg.norm(top_right - bottom_right)
    height_b = np.linalg.norm(top_left - bottom_left)
    width = int(max(width_a, width_b))
    height = int(max(height_a, height_b))
    if width < 200 or height < 200:
        return image.copy()
    destination = np.array(
        [[0, 0], [width - 1, 0], [width - 1, height - 1], [0, height - 1]],
        dtype="float32",
    )
    matrix = cv2.getPerspectiveTransform(
        np.array([top_left, top_right, bottom_right, bottom_left]), destination
    )
    return cv2.warpPerspective(image, matrix, (width, height))


def detect_document(image: np.ndarray) -> tuple[np.ndarray, bool]:
    """Find a large four-sided page and flatten it when possible."""
    height, width = image.shape[:2]
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (5, 5), 0)
    edges = cv2.Canny(gray, 50, 150)
    edges = cv2.morphologyEx(
        edges, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8), iterations=2
    )
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    minimum_area = height * width * 0.20
    for contour in sorted(contours, key=cv2.contourArea, reverse=True)[:12]:
        if cv2.contourArea(contour) < minimum_area:
            break
        perimeter = cv2.arcLength(contour, True)
        polygon = cv2.approxPolyDP(contour, 0.02 * perimeter, True)
        if len(polygon) == 4 and cv2.isContourConvex(polygon):
            flattened = _perspective_transform(image, polygon)
            return resize_for_processing(flattened), True
    return image.copy(), False


def measure_quality(image: np.ndarray, document_detected: bool) -> ImageQuality:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    height, width = gray.shape
    blur = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    brightness = float(gray.mean())
    # Count only sensor-clipped highlights. White paper is naturally bright, so
    # this remains a capture hint (interpreted alongside OCR), never a fraud
    # signal. A threshold of 253 avoids labelling normal off-white paper as glare.
    glare = float(np.count_nonzero(gray >= 253) / gray.size * 100)
    dark = float(np.count_nonzero(gray <= 25) / gray.size * 100)
    return ImageQuality(
        width=width,
        height=height,
        blur_variance=blur,
        brightness=brightness,
        glare_percent=glare,
        dark_percent=dark,
        document_detected=document_detected,
    )


def build_ocr_variants(document: np.ndarray) -> list[np.ndarray]:
    """Build two OCR-friendly variants without retaining any uploaded file."""
    gray = cv2.cvtColor(document, cv2.COLOR_BGR2GRAY)
    # Enlarge small documents because OCR character recognition improves when
    # text glyphs have more pixels.
    if max(gray.shape) < 1600:
        scale = min(2.0, 1800 / max(gray.shape))
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8)).apply(gray)
    denoised = cv2.fastNlMeansDenoising(clahe, None, 12, 7, 21)
    threshold = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        35,
        15,
    )
    return [denoised, threshold]


def decode_qr_codes(images: Iterable[np.ndarray]) -> list[str]:
    """Decode QR symbols locally with OpenCV; never visit their destinations."""
    detector = cv2.QRCodeDetector()
    values: list[str] = []
    for image in images:
        try:
            ok, decoded, _points, _straight = detector.detectAndDecodeMulti(image)
            if ok:
                values.extend(value.strip() for value in decoded if value.strip())
        except (cv2.error, ValueError):
            pass
        if not values:
            try:
                value, _points, _straight = detector.detectAndDecode(image)
                if value and value.strip():
                    values.append(value.strip())
            except (cv2.error, ValueError):
                pass
    # Preserve order while removing duplicates and cap untrusted payload sizes.
    return list(dict.fromkeys(value[:2048] for value in values))[:5]


def prepare_image(data: bytes) -> PreparedImage:
    original = resize_for_processing(decode_image(data))
    document, detected = detect_document(original)
    quality = measure_quality(document, detected)
    variants = build_ocr_variants(document)
    qr_values = decode_qr_codes((original, document))
    return PreparedImage(
        original=original,
        document=document,
        ocr_variants=variants,
        qr_values=qr_values,
        quality=quality,
    )
