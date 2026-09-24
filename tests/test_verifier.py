import unittest

from certificate_checker.field_extractor import extract_fields
from certificate_checker.verifier import screen_certificate
from tests.test_extractor import SAMPLE_TEXT


class VerifierTests(unittest.TestCase):
    def test_never_claims_image_is_authentic(self):
        fields = extract_fields(SAMPLE_TEXT)
        result = screen_certificate(
            fields=fields,
            raw_text=SAMPLE_TEXT,
            ocr_confidence=88,
            word_count=55,
            quality={
                "width": 1400,
                "height": 1900,
                "blur_variance": 145,
                "brightness": 201,
                "glare_percent": 4,
                "dark_percent": 1,
                "document_detected": True,
            },
            qr_values=["https://edistrict.delhigovt.nic.in/verify/SC-2025-001234"],
            state_code="delhi",
        )
        self.assertEqual(result["status"], "ready_for_official_verification")
        self.assertFalse(result["authenticity_verified"])
        self.assertEqual(result["document_completeness_percent"], 100)
        self.assertTrue(result["qr"][0]["official_url"])

    def test_explicit_demo_wording_routes_to_manual_review(self):
        text = "SYNTHETIC DEMO - NOT A REAL CERTIFICATE\n" + SAMPLE_TEXT
        fields = extract_fields(text)
        result = screen_certificate(
            fields=fields,
            raw_text=text,
            ocr_confidence=90,
            word_count=60,
            quality={
                "width": 1400, "height": 1900, "blur_variance": 145,
                "brightness": 201, "glare_percent": 4,
                "dark_percent": 1, "document_detected": True,
            },
            qr_values=[],
            state_code="delhi",
        )
        self.assertEqual(result["status"], "manual_review")
        self.assertFalse(result["authenticity_verified"])

    def test_poor_image_requests_recapture(self):
        fields = extract_fields(SAMPLE_TEXT)
        result = screen_certificate(
            fields=fields,
            raw_text=SAMPLE_TEXT,
            ocr_confidence=22,
            word_count=5,
            quality={
                "width": 430,
                "height": 600,
                "blur_variance": 12,
                "brightness": 80,
                "glare_percent": 32,
                "dark_percent": 20,
                "document_detected": False,
            },
            qr_values=[],
            state_code="auto",
        )
        self.assertEqual(result["status"], "recapture_needed")
        self.assertFalse(result["authenticity_verified"])


if __name__ == "__main__":
    unittest.main()
