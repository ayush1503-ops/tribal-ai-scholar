from pathlib import Path
def extract_text(file_path:str)->dict:
    # OCR adapter placeholder. Install/configure Tesseract or PaddleOCR before enabling.
    return {"file":Path(file_path).name,"text":"","confidence":None,"status":"NOT_RUN"}
