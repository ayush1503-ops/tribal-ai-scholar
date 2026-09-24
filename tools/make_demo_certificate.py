"""Create a clearly marked synthetic image for local OCR testing."""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "sample_data" / "synthetic_demo_certificate.png"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

image = np.full((1800, 1300, 3), 248, dtype=np.uint8)
navy = (69, 42, 19)  # BGR
muted = (95, 95, 95)
red = (55, 55, 190)
cv2.rectangle(image, (45, 45), (1255, 1755), navy, 4)
cv2.putText(image, "SYNTHETIC DEMO - NOT A REAL CERTIFICATE", (120, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.82, red, 2, cv2.LINE_AA)
cv2.putText(image, "GOVERNMENT OF NCT OF DELHI", (285, 235), cv2.FONT_HERSHEY_SIMPLEX, 0.9, navy, 2, cv2.LINE_AA)
cv2.putText(image, "SCHEDULED CASTE CERTIFICATE", (245, 300), cv2.FONT_HERSHEY_SIMPLEX, 0.9, navy, 2, cv2.LINE_AA)
cv2.line(image, (140, 340), (1160, 340), muted, 2)

lines = [
    "Certificate No: SC/2025/001234",
    "",
    "This is to certify that Shri Ravi Kumar",
    "son of Shri Mohan Kumar, resident of New Delhi,",
    "belongs to the Jatav caste which is recognized",
    "as a Scheduled Caste.",
    "",
    "Date of Issue: 12/03/2025",
    "District: New Delhi",
    "State: Delhi",
    "Issued by: Sub-Divisional Magistrate",
]
y = 440
for line in lines:
    if line:
        cv2.putText(image, line, (145, y), cv2.FONT_HERSHEY_SIMPLEX, 0.72, navy, 2, cv2.LINE_AA)
    y += 78

cv2.rectangle(image, (825, 1310), (1140, 1435), (210, 210, 210), 2)
cv2.putText(image, "DEMO SIGNATURE", (855, 1380), cv2.FONT_HERSHEY_SIMPLEX, 0.55, muted, 1, cv2.LINE_AA)
cv2.putText(image, "This file contains fictional data for software testing only.", (235, 1650), cv2.FONT_HERSHEY_SIMPLEX, 0.52, muted, 1, cv2.LINE_AA)

cv2.imwrite(str(OUTPUT), image)
print(OUTPUT)
