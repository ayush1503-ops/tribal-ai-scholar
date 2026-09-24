import io
import unittest

from certificate_checker.verifier import merge_screenings, screen_certificate


def _base_kwargs(**overrides):
    kwargs = {
        "fields": {
            "certificate_number": {"value": "SC/2025/001234"},
            "holder_name": {"value": "Ravi Kumar"},
            "category": {"value": "SC"},
            "issue_date": {"value": "12/03/2025"},
            "issuing_authority": {"value": "Sub-Divisional Magistrate"},
        },
        "raw_text": "SCHEDULED CASTE CERTIFICATE\nCertificate No: SC/2025/001234",
        "ocr_confidence": 90,
        "word_count": 40,
        "quality": {
            "width": 1400, "height": 1900, "blur_variance": 145,
            "brightness": 201, "glare_percent": 4,
            "dark_percent": 1, "document_detected": True,
        },
        "qr_values": [],
        "state_code": "delhi",
    }
    kwargs.update(overrides)
    return kwargs


class ForensicsTests(unittest.TestCase):
    def test_editor_metadata_routes_to_tampering(self):
        # Build a small image with a Photoshop software tag.
        from PIL import Image
        import numpy as np

        buf = io.BytesIO()
        image = Image.fromarray(np.full((400, 300, 3), 250, dtype=np.uint8))
        exif = Image.Exif()
        exif[0x0131] = "Adobe Photoshop CC 2023"
        image.save(buf, "JPEG", exif=exif)

        result = screen_certificate(image_bytes=buf.getvalue(), **_base_kwargs())
        self.assertEqual(result["status"], "potential_tampering")
        self.assertTrue(result["forensic_evidence"])
        self.assertFalse(result["authenticity_verified"])

    def test_clean_image_is_not_flagged(self):
        from PIL import Image
        import numpy as np

        buf = io.BytesIO()
        image = Image.fromarray(np.full((400, 300, 3), 250, dtype=np.uint8))
        image.save(buf, "JPEG")

        result = screen_certificate(image_bytes=buf.getvalue(), **_base_kwargs())
        self.assertEqual(result["status"], "ready_for_official_verification")
        self.assertEqual(result["forensic_evidence"], [])


class MergeTests(unittest.TestCase):
    def test_readable_certificate_page_leads_over_annexure(self):
        good = screen_certificate(**_base_kwargs(page=1))
        self.assertEqual(good["status"], "ready_for_official_verification")
        sparse = screen_certificate(
            **_base_kwargs(
                word_count=3,
                fields={},
                raw_text="ANNEXURE",
                page=2,
            )
        )
        merged = merge_screenings([good, sparse])
        self.assertEqual(merged["status"], "ready_for_official_verification")
        self.assertEqual(len(merged["pages"]), 2)

    def test_previous_page_screenings_are_reported(self):
        good = screen_certificate(**_base_kwargs(page=1))
        tampered = screen_certificate(**_base_kwargs(
            raw_text="SCHEDULED CASTE CERTIFICATE",
            image_bytes=self._junk_image(),
            page=2,
        ))
        # With no editing metadata this stays clean, so simulate tamper evidence.
        tampered["status"] = "potential_tampering"
        tampered["forensic_evidence"] = ["editor software"]
        merged = merge_screenings([good, tampered])
        self.assertEqual(merged["status"], "potential_tampering")
        self.assertEqual(merged["pages"][1]["status"], "potential_tampering")

    @staticmethod
    def _junk_image() -> bytes:
        from PIL import Image
        import numpy as np
        buf = io.BytesIO()
        Image.fromarray(np.full((300, 200, 3), 250, dtype=np.uint8)).save(buf, "JPEG")
        return buf.getvalue()


class PdfPipelineTests(unittest.TestCase):
    def setUp(self):
        try:
            import fitz  # noqa: F401
        except ImportError:
            self.skipTest("PyMuPDF not installed")

    def _two_page_cert_pdf(self) -> bytes:
        import fitz
        doc = fitz.open()
        page = doc.new_page(width=600, height=850)
        page.insert_text((60, 80), "GOVERNMENT OF NCT OF DELHI", fontsize=14)
        page.insert_text((60, 120), "SCHEDULED CASTE CERTIFICATE", fontsize=14)
        page.insert_text((60, 180), "Certificate No: SC/2025/001234", fontsize=12)
        page.insert_text((60, 220), "This is to certify that Shri Ravi Kumar", fontsize=12)
        page.insert_text((60, 280), "Date of Issue: 12/03/2025", fontsize=12)
        page2 = doc.new_page(width=600, height=850)
        page2.insert_text((60, 80), "ANNEXURE", fontsize=14)
        data = doc.tobytes()
        doc.close()
        return data

    def test_render_pages_and_export(self):
        from certificate_checker.pdf_pipeline import export_pdf, is_pdf_filename, render_pages
        self.assertTrue(is_pdf_filename("scan.pdf"))
        self.assertFalse(is_pdf_filename("photo.jpg"))
        pages = render_pages(self._two_page_cert_pdf(), max_pages=20)
        self.assertEqual(len(pages), 2)
        self.assertGreater(pages[0]["width"], 0)
        out = export_pdf([p["image"] for p in pages])
        self.assertTrue(out.startswith(b"%PDF"))

    def test_invalid_pdf_raises(self):
        from certificate_checker.pdf_pipeline import InvalidPdf, render_pages
        with self.assertRaises(InvalidPdf):
            render_pages(b"not a pdf at all", max_pages=5)


if __name__ == "__main__":
    unittest.main()
