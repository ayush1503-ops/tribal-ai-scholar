"""
Fake Document Detector — Photo Scan System (Advisory Forensic)
Detects possible tampering / fake documents from image forensics.
Uses OpenCV + Pillow + EXIF + JPEG ELA simulation + blur/noise/edge/metadata checks.

Never outputs "Fraud confirmed" — only advisory levels:
 Low (0-30): No tampering signals
 Medium (30-60): Inconsistencies — manual review suggested
 High (60-85): Multiple anomalies — additional verification required
 Very High (85-100): not used — capped at 85 to avoid auto-reject

All synthetic/training data — human officer decides.
"""
import os, io, hashlib, re, random, math, json
from typing import Dict, Any, List, Tuple
from datetime import datetime

try:
    import cv2
    import numpy as np
    from PIL import Image, ExifTags
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False

MODEL_VERSION = "fake-detector-v1-forensic-opencv"

# ---------- low-level forensic helpers ----------

def _estimate_laplacian_variance(img_gray):
    # OpenCV Laplacian variance = blur metric
    if not CV_AVAILABLE:
        return 250.0, "opencv not available"
    try:
        lap = cv2.Laplacian(img_gray, cv2.CV_64F)
        var = float(lap.var())
        return var, f"Laplacian variance {var:.1f}"
    except Exception as e:
        return 200.0, str(e)

def _jpeg_ela_score(image_path: str, content_bytes: bytes = None):
    """
    Error Level Analysis simulation:
    Re-save JPEG at quality 90, compute absolute difference mean.
    High difference uniformity = likely single compression (authentic).
    High variance / localized hotspots = possible double compression / pasting.
    Returns score 0-30 (penalty) + detail.
    """
    if not CV_AVAILABLE:
        return 0, "ELA skipped (opencv missing)", 0.0
    try:
        # Load image
        if content_bytes:
            arr = np.frombuffer(content_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        else:
            img = cv2.imread(image_path, cv2.IMREAD_COLOR)
        if img is None:
            return 5, "ELA: could not decode image", 0.0
        # Recompress at quality 90
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        _, buf = cv2.imencode('.jpg', img, encode_param)
        recompressed = cv2.imdecode(buf, cv2.IMREAD_COLOR)
        # Diff
        diff = cv2.absdiff(img, recompressed)
        # Convert to grayscale diff mean
        gray_diff = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
        mean_diff = float(np.mean(gray_diff))
        std_diff = float(np.std(gray_diff))
        # Heuristic: authentic single JPEG -> mean 2-7, std low (3-6)
        # Edited image with pasted region -> std high (>10) or mean anomalous
        penalty = 0
        detail_parts = []
        if 1.5 <= mean_diff <= 8 and std_diff < 9:
            penalty = 0
            detail_parts.append(f"ELA mean {mean_diff:.1f} std {std_diff:.1f} — single compression (authentic pattern)")
        elif 8 < mean_diff <= 14 and std_diff < 12:
            penalty = 8
            detail_parts.append(f"ELA mean {mean_diff:.1f} std {std_diff:.1f} — moderate recompression")
        elif mean_diff > 14 or std_diff > 14:
            penalty = 18
            detail_parts.append(f"ELA mean {mean_diff:.1f} std {std_diff:.1f} — localized high difference (possible pasted region / double JPEG)")
        else:
            penalty = 3
            detail_parts.append(f"ELA mean {mean_diff:.1f} std {std_diff:.1f} — low difference")
        # Hotspot detection: find high-diff blobs
        _, thresh = cv2.threshold(gray_diff, 30, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        large_hotspots = sum(1 for c in contours if cv2.contourArea(c) > 1500)
        if large_hotspots >= 3:
            penalty += 7
            detail_parts.append(f"{large_hotspots} large hotspots — possible copy-paste")
        elif large_hotspots >= 1:
            penalty += 3
        return min(30, penalty), "; ".join(detail_parts), mean_diff
    except Exception as e:
        return 5, f"ELA error: {str(e)[:80]}", 0.0

def _blur_map_analysis(img_gray, is_document=False):
    if not CV_AVAILABLE:
        return 0, "Blur analysis skipped", 0
    try:
        h, w = img_gray.shape
        # Split into 3x3 grid, compute variance per block
        block_vars = []
        for r in range(3):
            for c in range(3):
                y0, y1 = int(r*h/3), int((r+1)*h/3)
                x0, x1 = int(c*w/3), int((c+1)*w/3)
                block = img_gray[y0:y1, x0:x1]
                var = float(cv2.Laplacian(block, cv2.CV_64F).var())
                block_vars.append(var)
        mean_var = float(np.mean(block_vars))
        std_var = float(np.std(block_vars))
        # For documents, text vs empty white causes natural high variance spread — don't penalize heavily
        if is_document:
            if mean_var < 25:
                return 8, f"Document very blurry (mean {mean_var:.0f}) — readability risk", mean_var
            if std_var > 6000:
                return 6, f"Document blur variation high (std {std_var:.0f}) — check", mean_var
            return 0, f"Document blur expected (mean {mean_var:.0f}, std {std_var:.0f}) — text vs blank normal", mean_var
        # Photo mode thresholds
        if mean_var < 35:
            return 12, f"Image very blurry (mean Laplacian {mean_var:.0f}) — readability risk", mean_var
        if std_var > 180 and mean_var > 70:
            return 14, f"Blur inconsistency across regions (std {std_var:.0f}, mean {mean_var:.0f}) — possible spliced region", mean_var
        if std_var > 90:
            return 6, f"Moderate blur variation (std {std_var:.0f})", mean_var
        return 0, f"Blur uniform (mean {mean_var:.0f}, std {std_var:.0f})", mean_var
    except Exception as e:
        return 4, f"Blur check error: {e}", 0

def _noise_analysis(img_gray, is_document=False):
    if not CV_AVAILABLE:
        return 0, "Noise check skipped", 0
    try:
        blur = cv2.medianBlur(img_gray, 3)
        noise = cv2.absdiff(img_gray, blur)
        h = img_gray.shape[0]
        top_noise = float(np.std(noise[0:h//2]))
        bot_noise = float(np.std(noise[h//2:]))
        diff = abs(top_noise - bot_noise)
        if is_document:
            # Documents: text header vs blank footer is natural — only flag extreme diff
            if diff > 22 and max(top_noise, bot_noise) > 14:
                return 8, f"Document noise inconsistency top {top_noise:.1f} vs bottom {bot_noise:.1f} — possible composite", diff
            if diff > 16:
                return 3, f"Document noise variation {diff:.1f} — check", diff
            return 0, f"Document noise expected ({top_noise:.1f}/{bot_noise:.1f})", diff
        if diff > 6 and max(top_noise, bot_noise) > 8:
            return 10, f"Noise inconsistency top {top_noise:.1f} vs bottom {bot_noise:.1f} — possible composite", diff
        if diff > 3.5:
            return 5, f"Noise variation {diff:.1f} — check", diff
        return 0, f"Noise uniform ({top_noise:.1f}/{bot_noise:.1f})", diff
    except Exception as e:
        return 3, f"Noise error: {e}", 0

def _edge_analysis(img_gray):
    if not CV_AVAILABLE:
        return 0, "Edge check skipped", 0
    try:
        edges = cv2.Canny(img_gray, 80, 180)
        density = float(np.mean(edges > 0) * 100)  # % edge pixels
        # Histogram of edge blocks
        h, w = edges.shape
        blocks = []
        for r in range(2):
            for c in range(2):
                blk = edges[int(r*h/2):int((r+1)*h/2), int(c*w/2):int((c+1)*w/2)]
                blocks.append(float(np.mean(blk > 0)))
        std = float(np.std(blocks) * 100)
        if density < 0.8:
            return 8, f"Very low edge density {density:.1f}% — possibly washed / blank / low-contrast", density
        if std > 1.8 and density > 2:
            return 7, f"Edge density inconsistent std {std:.1f}% — possible pasted text/graphics", density
        return 0, f"Edge density {density:.1f}% uniform", density
    except Exception as e:
        return 3, f"Edge error: {e}", 0

def _histogram_check(img_gray, is_document=False):
    try:
        hist = cv2.calcHist([img_gray], [0], None, [256], [0,256]) if CV_AVAILABLE else None
        if hist is None:
            return 0, "Histogram check skipped (no cv2)", 0
        hist = hist.flatten()
        total = float(np.sum(hist))
        max_bin = int(np.argmax(hist))
        max_ratio = float(hist[max_bin] / total) if total>0 else 0
        white_ratio = float(np.sum(hist[250:]) / total) if total>0 else 0
        # For documents, white background peak at 255 is expected — don't flag high white as fake
        if is_document:
            if max_bin == 255:
                # White peak is normal; only flag if >98% blank or very low contrast
                if white_ratio > 0.985:
                    return 10, f"Nearly blank white {white_ratio:.1%} — possible blank page", white_ratio
                if white_ratio > 0.975:
                    return 2, f"High white {white_ratio:.1%} — typical for certificate", white_ratio
                return 0, f"Histogram normal document white {white_ratio:.1%} peak {max_bin}", max_ratio
            # Non-white peak high indicates thresholding / synthetic
            if max_ratio > 0.45:
                return 8, f"Histogram peak at {max_bin} ({max_ratio:.1%}) — thresholded / synthetic", max_ratio
            if max_ratio > 0.30:
                return 4, f"Histogram peak at {max_bin} ({max_ratio:.1%})", max_ratio
            return 0, f"Histogram normal peak {max_bin} ({max_ratio:.1%}) white {white_ratio:.1%}", max_ratio
        # Photo mode
        if max_ratio > 0.38:
            return 8, f"Histogram peak at {max_bin} ({max_ratio:.1%}) — thresholded / synthetic", max_ratio
        if max_ratio > 0.30:
            return 4, f"Histogram peak at {max_bin} ({max_ratio:.1%})", max_ratio
        if white_ratio > 0.97:
            return 10, f"Nearly blank white {white_ratio:.1%} — possible blank page", white_ratio
        if white_ratio > 0.93:
            return 4, f"High white {white_ratio:.1%} — typical for scanned certificate", white_ratio
        return 0, f"Histogram normal peak {max_bin} ({max_ratio:.1%}) white {white_ratio:.1%}", max_ratio
    except Exception as e:
        return 2, f"Histogram error: {e}", 0

def _metadata_scan(file_path: str, content_bytes: bytes = None):
    penalties = []
    details = []
    score = 0
    try:
        # Try PIL EXIF
        img = None
        if content_bytes:
            try:
                img = Image.open(io.BytesIO(content_bytes))
            except: pass
        elif file_path and os.path.exists(file_path):
            try:
                img = Image.open(file_path)
            except: pass
        if img is None:
            details.append("No image metadata available")
            return 0, details
        # Format check
        fmt = img.format or "unknown"
        details.append(f"Format {fmt} {img.size[0]}x{img.size[1]} {img.mode}")
        exif = {}
        try:
            raw = img._getexif()  # type: ignore
            if raw:
                for tag, val in raw.items():
                    name = ExifTags.TAGS.get(tag, tag)
                    exif[str(name)] = str(val)[:120]
        except: pass
        if exif:
            # Software tag
            software = exif.get("Software") or exif.get("software") or ""
            if software:
                if any(s in software.lower() for s in ["photoshop","gimp","picsart","snapseed","canva","adobe","paint","editor"]):
                    score += 12
                    details.append(f"EXIF Software: {software} — image passed through editor (check)")
                else:
                    details.append(f"EXIF Software: {software}")
            # Date
            dt = exif.get("DateTime") or exif.get("DateTimeOriginal") or ""
            if dt:
                details.append(f"EXIF Date: {dt}")
                # Check future date?
                try:
                    # Format "2023:08:12 10:00:00"
                    parsed = datetime.strptime(dt.split()[0], "%Y:%m:%d")
                    if parsed > datetime.now():
                        score += 8
                        details.append("EXIF date in future — possible manipulation")
                except: pass
            if not exif:
                details.append("No EXIF — typical for scanned docs / screenshots")
            else:
                details.append(f"EXIF fields: {len(exif)}")
        else:
            details.append("No EXIF found — common for scans; not a signal alone")
            # Not penalize missing EXIF heavily
        # DPI check
        dpi = img.info.get("dpi", None)
        if dpi:
            details.append(f"DPI {dpi}")
        # Filename heuristic
        fname = os.path.basename(file_path).lower() if file_path else ""
        if any(k in fname for k in ["screenshot","screen_shot","photo","whatsapp","compressed","edited"]):
            score += 5
            details.append(f"Filename suggests {fname} — check source")
        # Hash for later duplicate check not here
        # If Software missing but image is photographic, low score
        # If software indicates editor + other forensic signals, later combine will boost
        return min(20, score), details
    except Exception as e:
        details.append(f"Metadata error: {str(e)[:80]}")
        return 3, details

def _template_check(filename: str, doc_type_hint: str):
    """
    Simple template heuristic: expected keywords per doc type vs filename.
    Not strong signal alone.
    """
    low = (filename or "").lower()
    hint = (doc_type_hint or "").lower()
    score = 0
    details = []
    # If filename says st_certificate but OCR says income, mismatch flag later via doc_classifier
    # Here just check for suspicious filenames
    suspicious = ["fake","test","sample","dummy","template","generated"]
    for s in suspicious:
        if s in low:
            score += 4
            details.append(f"Filename contains '{s}' — synthetic/demo file")
    if not details:
        details.append("Filename typical")
    return score, details

# ---------- main detector ----------

class FakeDocumentDetector:
    def __init__(self):
        self.version = MODEL_VERSION

    def _level(self, score: float) -> Tuple[str, str, str]:
        if score < 30:
            return "Low", "No tampering signals detected — standard verification", "Routine check by officer"
        if score < 60:
            return "Medium", "Minor inconsistencies — manual review suggested", "Manual review of document"
        # cap at 85 to avoid auto-reject
        if score < 85:
            return "High", "Multiple anomalies — additional verification required", "Additional verification required before decision"
        return "High", "Multiple anomalies — additional verification required", "Additional verification required before decision"

    def scan(self, file_path: str = None, content_bytes: bytes = None, filename: str = None, doc_type_hint: str = None) -> Dict[str, Any]:
        filename = filename or (os.path.basename(file_path) if file_path else "document.jpg")
        # Load image for cv
        img_gray = None
        img_color = None
        load_ok = False
        load_detail = ""
        if CV_AVAILABLE:
            try:
                if content_bytes:
                    arr = np.frombuffer(content_bytes, np.uint8)
                    img_color = cv2.imdecode(arr, cv2.IMREAD_COLOR)
                    if img_color is not None:
                        img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)
                        load_ok = True
                        load_detail = f"Loaded from bytes {len(content_bytes)} bytes"
                elif file_path and os.path.exists(file_path):
                    img_color = cv2.imread(file_path, cv2.IMREAD_COLOR)
                    if img_color is not None:
                        img_gray = cv2.cvtColor(img_color, cv2.COLOR_BGR2GRAY)
                        load_ok = True
                        load_detail = f"Loaded {file_path}"
                if not load_ok:
                    # Try PIL fallback
                    pil = Image.open(file_path) if file_path and os.path.exists(file_path) else Image.open(io.BytesIO(content_bytes)) if content_bytes else None
                    if pil:
                        pil_gray = pil.convert("L")
                        img_gray = np.array(pil_gray)
                        load_ok = True
                        load_detail = f"PIL fallback {pil.size}"
            except Exception as e:
                load_detail = f"Load error: {e}"
                load_ok = False
        else:
            load_detail = "OpenCV not available — limited scan"

        factors: List[Dict] = []
        total_score = 0
        evidence: List[str] = []
        forensic_details: List[str] = []

        # 0. Load check
        if not load_ok or img_gray is None:
            factors.append({"name":"Image load","status":"fail","score":8,"detail": load_detail or "Could not decode image — manual review", "max":10})
            total_score += 8
            evidence.append("Image could not be decoded cleanly")
        else:
            h, w = img_gray.shape
            factors.append({"name":"Image load","status":"pass","score":0,"detail": f"{w}x{h} loaded", "max":0})
            forensic_details.append(load_detail)
            if w < 500 or h < 350:
                factors.append({"name":"Resolution","status":"warn","score":6,"detail": f"Low resolution {w}x{h} — possible cropped / screenshot", "max":10})
                total_score += 6
                evidence.append(f"Low resolution {w}x{h}")
            else:
                factors.append({"name":"Resolution","status":"pass","score":0,"detail": f"Resolution {w}x{h}", "max":10})

            # 1. ELA
            ela_penalty, ela_detail, ela_mean = _jpeg_ela_score(file_path or filename, content_bytes)
            total_score += ela_penalty
            status = "pass" if ela_penalty==0 else "warn" if ela_penalty<12 else "fail"
            factors.append({"name":"Compression / ELA","status":status,"score":ela_penalty,"detail": ela_detail, "max":30})
            if ela_penalty>=8:
                evidence.append(ela_detail)
            forensic_details.append(f"ELA mean {ela_mean:.1f}")

            # 2. Blur map — pass document hint
            is_doc = bool(doc_type_hint) or filename.lower().endswith(('.jpg','.jpeg','.png','.pdf'))
            blur_pen, blur_detail, blur_mean = _blur_map_analysis(img_gray, is_document=is_doc)
            total_score += blur_pen
            factors.append({"name":"Blur consistency","status": "pass" if blur_pen==0 else "warn" if blur_pen<10 else "fail","score": blur_pen,"detail": blur_detail, "max":14})
            if blur_pen>=6:
                evidence.append(blur_detail)

            # 3. Noise
            noise_pen, noise_detail, noise_diff = _noise_analysis(img_gray, is_document=is_doc)
            total_score += noise_pen
            factors.append({"name":"Noise consistency","status": "pass" if noise_pen==0 else "warn" if noise_pen<8 else "fail","score": noise_pen,"detail": noise_detail, "max":10})
            if noise_pen>=5:
                evidence.append(noise_detail)

            # 4. Edges
            edge_pen, edge_detail, edge_dens = _edge_analysis(img_gray)
            total_score += edge_pen
            factors.append({"name":"Edge / text consistency","status": "pass" if edge_pen==0 else "warn","score": edge_pen,"detail": edge_detail, "max":8})
            if edge_pen>=6:
                evidence.append(edge_detail)

            # 5. Histogram
            is_doc_hist = bool(doc_type_hint)
            hist_pen, hist_detail, hist_ratio = _histogram_check(img_gray, is_document=is_doc_hist)
            total_score += hist_pen
            factors.append({"name":"Histogram / contrast","status": "pass" if hist_pen==0 else "warn","score": hist_pen,"detail": hist_detail, "max":8})
            if hist_pen>=4:
                evidence.append(hist_detail)

        # 6. Metadata
        meta_pen, meta_details = _metadata_scan(file_path or filename, content_bytes)
        total_score += meta_pen
        factors.append({"name":"Metadata (EXIF / software)","status": "pass" if meta_pen==0 else "warn" if meta_pen<8 else "fail","score": meta_pen,"detail": "; ".join(meta_details[:2]), "max":20, "full_details": meta_details})
        if meta_pen>=8:
            evidence.extend([d for d in meta_details if "Software" in d or "future" in d.lower()])

        # 7. Template/filename
        tmpl_pen, tmpl_details = _template_check(filename or "", doc_type_hint or "")
        total_score += tmpl_pen
        factors.append({"name":"Filename / type hint","status":"pass" if tmpl_pen==0 else "warn","score": tmpl_pen,"detail": "; ".join(tmpl_details), "max":10})
        if tmpl_pen>0:
            evidence.extend(tmpl_details)

        # 8. File size / entropy heuristic
        if content_bytes:
            size = len(content_bytes)
            if size < 8000:
                total_score += 6
                factors.append({"name":"File size","status":"warn","score":6,"detail": f"Very small {size} bytes — possible blank/corrupted", "max":10})
                evidence.append(f"File very small {size} bytes")
            elif size > 4_900_000:
                factors.append({"name":"File size","status":"pass","score":0,"detail": f"Large {size} bytes", "max":10})
            else:
                factors.append({"name":"File size","status":"pass","score":0,"detail": f"Size {size} bytes", "max":10})
            # Entropy hint: high entropy = photo, low = synthetic flat
            # Compute byte entropy quickly
            try:
                from collections import Counter
                cnt = Counter(content_bytes)
                ent = -sum((c/size)*math.log2(c/size) for c in cnt.values() if c>0)
                if ent < 6.5 and size>15000:
                    factors.append({"name":"Byte entropy","status":"pass","score":0,"detail": f"Entropy {ent:.2f} (photo typical 7-8)", "max":5})
                else:
                    factors.append({"name":"Byte entropy","status":"pass","score":0,"detail": f"Entropy {ent:.2f}", "max":5})
            except:
                pass

        # Composite tampering risk — Photoshop + low-res/screenshot/fake filename together is stronger signal than sum
        try:
            has_photoshop = any("Photoshop" in d or "photoshop" in d.lower() or "Adobe" in d for d in meta_details)
            low_fname = filename.lower() if filename else ""
            has_screenshot = ("screenshot" in low_fname or "whatsapp" in low_fname)
            low_res_flag = any(f["name"]=="Resolution" and f["score"]>0 for f in factors)
            # Graduated composite: Photoshop + screenshot/low-res => High 30; Photoshop + fake/edited filename only => Medium 18
            if has_photoshop and (has_screenshot or low_res_flag):
                bonus = 30
                total_score += bonus
                factors.append({"name":"Composite tampering risk","status":"fail","score":bonus,"detail": "Photoshop EXIF + low-res / screenshot + synthetic filename together — possible edited copy", "max":30})
                evidence.append("Composite: Photoshop software + screenshot/low-res + synthetic filename")
            elif has_photoshop and tmpl_pen>0:
                bonus = 18
                total_score += bonus
                factors.append({"name":"Composite edited copy risk","status":"fail","score":bonus,"detail": "Photoshop EXIF + synthetic filename — possible edited copy (check original)", "max":18})
                evidence.append("Composite: Photoshop software + synthetic filename")
            elif has_photoshop and total_score>15:
                # Photoshop alone with other moderate signals
                bonus = 8
                total_score += bonus
                factors.append({"name":"Editor software risk","status":"warn","score":bonus,"detail": "Image passed through Photoshop/editor — verify source", "max":8})
                evidence.append("EXIF shows Photoshop/editor")
        except:
            pass

        # Cap and derive level
        total_score = min(85, max(0, total_score))
        level, verdict, recommendation = self._level(total_score)

        # Needs review if medium+
        needs_review = total_score >= 30
        # Advisory: never say fraud confirmed
        disclaimer = "Forensic scan is advisory only — detects inconsistencies, not proof of fraud. Officer must verify with original issuing authority if needed. No automatic rejection."

        # Build response
        # If high but only metadata + filename, downgrade? But keep logic transparent
        # Evidence cleaning
        evidence = list(dict.fromkeys(evidence))[:6]
        if not evidence and level=="Low":
            evidence = ["No forensic anomalies detected in compression, blur, noise, edges, histogram, metadata"]

        return {
            "model": self.version,
            "score": round(float(total_score),1),
            "level": level,
            "verdict": verdict,
            "recommendation": recommendation,
            "needs_review": needs_review,
            "factors": factors,
            "evidence": evidence,
            "forensic_details": forensic_details[:4],
            "filename": filename,
            "doc_type_hint": doc_type_hint,
            "disclaimer": disclaimer,
            "timestamp": datetime.utcnow().isoformat(),
            "advisory": True
        }

    def quick_scan(self, file_path: str, filename: str = None) -> Dict[str,Any]:
        # Convenience for polling
        try:
            with open(file_path, "rb") as f:
                b = f.read()
        except:
            b = None
        return self.scan(file_path=file_path, content_bytes=b, filename=filename or os.path.basename(file_path))

_singleton = None
def get_fake_detector():
    global _singleton
    if _singleton is None:
        _singleton = FakeDocumentDetector()
    return _singleton
