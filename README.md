# SC/ST Certificate Check Desk

A privacy-first OpenCV web app that:

1. captures a certificate photo from the browser or accepts an upload,
2. finds and straightens the page with OpenCV,
3. improves contrast and runs local English/Hindi Tesseract OCR,
4. extracts common certificate fields,
5. decodes QR data locally, and
6. prepares the document for **official issuer-record verification**.

> **Important:** this tool does not declare a caste certificate “true” or “fake” from image appearance. A photograph cannot prove that an authority issued a record. The app returns **Recapture needed**, **Not a caste certificate**, **Manual review required**, **Possible tampering — verify**, or **Ready for official verification**. A final finding must come from the issuing authority, a verifiable digitally signed QR, or an approved government API.

It must not be used by itself to approve, reject, rank, or deny anyone in admissions, employment, benefits, or another high-impact process.

## Project structure

```text
sc-st-certificate-verifier/
├── app.py                         # Flask web server and API
├── cli.py                         # Optional command-line interface
├── certificate_checker/
│   ├── config.py                  # State portal/domain allowlist
│   ├── image_pipeline.py          # OpenCV page detection, cleanup, QR
│   ├── ocr_engine.py              # RapidOCR + Tesseract OCR adapter
│   ├── pdf_pipeline.py            # PDF page rendering, OCR, PDF export
│   ├── field_extractor.py         # Label/regex-based field extraction
│   └── verifier.py                # Quality, consistency + forensic screening
├── templates/index.html           # Camera/upload interface
├── static/styles.css
├── static/app.js
├── tests/                         # Unit tests (no real certificates)
├── tools/make_demo_certificate.py # Creates a synthetic test image
├── requirements.txt
├── run.sh
└── run.bat
```

## 1. Install OCR

The app works with **RapidOCR (no system binary needed)** or Tesseract. RapidOCR
is the default in this environment and nothing else is required:

```bash
pip install rapidocr-onnxruntime
```

### Optional: Tesseract (multi-language)

Tesseract is a local executable; installing the Python package alone is not enough.

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install tesseract-ocr tesseract-ocr-eng tesseract-ocr-hin
```

### macOS (Homebrew)

```bash
brew install tesseract tesseract-lang
```

### Windows

Install a current Tesseract build with English and, if needed, Hindi language data. Add its installation directory to `PATH`, or set the executable explicitly:

```bat
set TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Hindi is optional. The app automatically uses `eng+hin` when both are installed and falls back to `eng` otherwise.

## 2. Install and run

Python 3.10 or newer is recommended.

```bash
cd sc-st-certificate-verifier
python3 -m venv .venv
source .venv/bin/activate              # Windows: .venv\Scripts\activate
pip install -r requirements-full.txt   # includes RapidOCR, PyMuPDF, OpenCV, img2pdf
python app.py
```

Open <http://localhost:8000>. Browser camera access works on `localhost` or an HTTPS origin. If camera permission is unavailable, use **Upload image**.

The health banner at the top says whether local OCR and PDF scanning are ready.

### Scanned PDFs

Uploading a `.pdf` scans it page by page (up to 20 pages): each page is rendered
with PyMuPDF, straightened with OpenCV, OCR'd locally, and screened. The report
shows a per-page verdict, and the **Download searchable PDF** button exports the
cleaned pages back into a single PDF. The CLI supports this too:

```bash
python cli.py path/to/certificate.pdf --state delhi --output report.json --export-pdf cleaned.pdf
```

### Command line

```bash
python cli.py path/to/certificate.jpg --state delhi --output report.json
```

The image is processed in memory. The CLI writes a report only when `--output` is supplied.

## Test with fictional data

Create a visibly marked, synthetic certificate image:

```bash
python tools/make_demo_certificate.py
```

Then upload `sample_data/synthetic_demo_certificate.png`. Never add a real person's certificate to source control or a test fixture.

## What the checks mean

| Check | What it can show | What it cannot show |
|---|---|---|
| Resolution, sharpness, glare | Whether OCR/review is likely reliable | Authenticity |
| Expected labels and fields | Template/text consistency | That a record exists |
| Issue-date parsing | Obvious future-date inconsistency | Whether the date was issued by government |
| QR decode | The payload printed in the image | Trustworthiness of an unverified payload |
| Configured government-domain QR | The link uses an allowlisted issuer host | That the linked record matches until opened and compared |
| Compression / ELA | Localized re-compression hotspots that may indicate an edited or pasted region | Proof of tampering |
| Noise consistency | Regions that carry very different sensor noise | Proof of tampering |
| Software metadata | The image was saved through an editor (e.g. Photoshop) | Proof of a fake |

Forensic signals are **advisory only** and route the file to “Possible tampering —
verify”, never to an automatic fraud verdict. Scanners, photocopies, and
legitimate retouching can trigger them, and they can easily be avoided — so a
clean forensic result is equally **not** proof of authenticity.

## Official verification workflow

1. Retake poor images before review.
2. Compare every extracted field against the photo; OCR can be wrong.
3. Open the configured issuing portal yourself. The server never follows QR URLs automatically, preventing accidental data disclosure and server-side request forgery.
4. Search using the certificate number or use the QR destination.
5. Compare holder name, category, caste/tribe/community, issue date, district, and authority.
6. If the portal cannot confirm it, route the case to the issuing office or the organization's authorized verification process. Do not infer fraud from a portal outage or an old paper certificate.

The included Delhi preset points to the Delhi e-District portal:

- <https://edistrict.delhigovt.nic.in/>
- Delhi district information page: <https://dmeast.delhi.gov.in/service/caste-certificate/>

Portal details can change. Confirm current government guidance before production use.

## Add another State/UT

Edit `certificate_checker/config.py`:

```python
"example": {
    "name": "Example State",
    "portal": "https://official.example.gov.in/",
    "portal_label": "Example official portal",
    "official_domains": ["official.example.gov.in"],
},
```

Only add domains verified through a current government source. Do not allow broad look-alike patterns. Then add state-specific OCR labels/templates to `field_extractor.py` and unit tests using fictional values.

For a production-grade binary result, implement an adapter to an **authorized issuer API** or verify a signed QR against the issuer's published public key. Keep that authoritative result separate from computer-vision quality checks, log who initiated the lookup, and retain only the minimum data required by policy.

## Privacy and security

- Uploaded images and PDFs are read into memory and are not written to disk.
- Responses use `Cache-Control: no-store`.
- QR destinations are decoded but never fetched by the server.
- The upload is capped at 25 MB and decoded images at 25 megapixels. PDF pages are capped at 20.
- No face recognition or identity matching is performed.
- Reports contain sensitive caste and identity data. Download only when necessary, encrypt at rest, restrict access, set a deletion period, and avoid sharing over chat/email.
- Put authentication, authorization, TLS, audit logging, rate limiting, malware scanning, and an approved retention policy in front of the app before organizational deployment.

## Run tests

```bash
python -m unittest discover -s tests -v
```

The unit tests contain only fictional data and do not require Tesseract.

## Known limitations

- Certificate wording and layouts differ by State/UT, district, language, and issue year.
- Handwriting, embossed seals, faded photocopies, and highly stylized type may OCR poorly.
- Hindi extraction requires `tesseract-ocr-hin`; other local languages need their respective trained data plus extraction rules.
- RapidOCR reads English/Hindi mixed documents by default output, but a document's language is not auto-detected as thoroughly as a dedicated multilingual model.
- Forensic checks (ELA, noise, metadata) are advisory and can be bypassed; they must never be treated as an authenticity decision.
- OpenCV's QR decoder does not cryptographically validate a signed payload.
- The default project has only a Delhi portal preset. Select “Auto-detect / other state” for other issuers until a verified configuration is added.
