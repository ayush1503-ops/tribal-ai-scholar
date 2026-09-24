import unittest

from certificate_checker.field_extractor import extract_fields


SAMPLE_TEXT = """GOVERNMENT OF NCT OF DELHI
SCHEDULED CASTE CERTIFICATE
Certificate No: SC/2025/001234
This is to certify that Shri Ravi Kumar son of Shri Mohan Kumar
resident of New Delhi belongs to the Jatav caste which is recognized
as a Scheduled Caste.
Date of Issue: 12/03/2025
District: New Delhi
Issued by: Sub-Divisional Magistrate
"""


class FieldExtractorTests(unittest.TestCase):
    def test_extracts_core_fields(self):
        fields = extract_fields(SAMPLE_TEXT)
        self.assertEqual(fields["certificate_number"]["value"], "SC/2025/001234")
        self.assertEqual(fields["holder_name"]["value"], "Ravi Kumar")
        self.assertEqual(fields["relation_name"]["value"], "Mohan Kumar")
        self.assertEqual(fields["category"]["value"], "SC")
        self.assertEqual(fields["caste_or_tribe"]["value"], "Jatav")
        self.assertEqual(fields["issue_date"]["value"], "12/03/2025")
        self.assertEqual(fields["district"]["value"], "New Delhi")
        self.assertEqual(fields["state"]["value"], "DELHI")
        self.assertEqual(fields["issuing_authority"]["value"], "Sub-Divisional Magistrate")

    def test_missing_values_are_not_invented(self):
        fields = extract_fields("An unrelated and unreadable page")
        self.assertIsNone(fields["certificate_number"]["value"])
        self.assertIsNone(fields["holder_name"]["value"])
        self.assertIsNone(fields["category"]["value"])


if __name__ == "__main__":
    unittest.main()
