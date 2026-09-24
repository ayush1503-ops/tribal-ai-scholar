# Vercel Deployment Notes

This Flask application uses **Tesseract OCR** which requires a system binary installation. Vercel's serverless Python runtime does not support installing system packages like `tesseract-ocr` by default.

## Deployment Options

### Option 1: Vercel (with external OCR API)
Replace the local Tesseract OCR with a cloud OCR API (e.g., Google Cloud Vision, AWS Textract, Azure Computer Vision, or OCR.space).

### Option 2: Alternative Platforms (Recommended for this app)
Deploy to platforms that support system packages:
- **Railway** - `railway up`
- **Render** - Connect GitHub repo, add `tesseract-ocr` to build
- **Fly.io** - `fly launch`, Dockerfile installs tesseract
- **Google Cloud Run** - Docker-based, full system control

### Option 3: Vercel with Docker (Experimental)
Use Vercel's Docker support with a custom Dockerfile that installs Tesseract.

## Quick Deploy to Railway (Recommended)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add `tesseract-ocr` and `tesseract-ocr-hin` to the install step
4. Set `PORT` environment variable (Railway provides this automatically)

## Local Development

```bash
pip install -r requirements.txt
# Install Tesseract: https://github.com/tesseract-ocr/tesseract
python app.py
```

## Project Structure for Vercel

```
├── api/
│   └── index.py          # Vercel entry point
├── app.py                # Main Flask app
├── vercel.json           # Vercel configuration
├── requirements.txt      # Python dependencies
├── certificate_checker/  # Core logic
├── static/               # CSS, JS
└── templates/            # HTML templates
```

## Known Limitations on Vercel

- ❌ Local Tesseract OCR will not work (missing system binary)
- ❌ Camera access requires HTTPS (works on Vercel preview/production)
- ✅ Static files served correctly
- ✅ API routes work
- ✅ Health endpoint works (will show OCR as unavailable)