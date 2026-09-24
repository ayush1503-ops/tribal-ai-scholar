"use strict";

const $ = (selector) => document.querySelector(selector);

const camera = $("#camera");
const canvas = $("#capture-canvas");
const preview = $("#preview");
const placeholder = $("#camera-placeholder");
const cameraStage = $("#camera-stage");
const startCameraButton = $("#start-camera");
const captureButton = $("#capture-photo");
const fileInput = $("#file-input");
const analyzeButton = $("#analyze-button");
const errorBox = $("#capture-error");

let mediaStream = null;
let selectedBlob = null;
let selectedFilename = "certificate.jpg";
let previewObjectUrl = null;
let lastReport = null;

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
}

function clearError() {
  errorBox.textContent = "";
  errorBox.hidden = true;
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
    mediaStream = null;
  }
  camera.srcObject = null;
  camera.hidden = true;
  captureButton.hidden = true;
  startCameraButton.hidden = false;
  startCameraButton.innerHTML = '<span aria-hidden="true">◉</span> Open camera';
  cameraStage.classList.remove("camera-active");
}

function releasePreviewUrl() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }
}

function showSelectedImage(blob, filename) {
  stopCamera();
  releasePreviewUrl();
  selectedBlob = blob;
  selectedFilename = filename || "certificate.jpg";
  previewObjectUrl = URL.createObjectURL(blob);
  preview.src = previewObjectUrl;
  preview.hidden = false;
  placeholder.hidden = true;
  analyzeButton.disabled = false;
  startCameraButton.innerHTML = '<span aria-hidden="true">↻</span> Retake photo';
  clearError();
}

async function startCamera() {
  clearError();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError("Camera access is unavailable here. Use Upload image instead.");
    return;
  }
  stopCamera();
  releasePreviewUrl();
  preview.hidden = true;
  placeholder.hidden = true;
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1440 }
      }
    });
    camera.srcObject = mediaStream;
    camera.hidden = false;
    captureButton.hidden = false;
    startCameraButton.hidden = true;
    cameraStage.classList.add("camera-active");
    await camera.play();
  } catch (error) {
    stopCamera();
    placeholder.hidden = false;
    const denied = error && (error.name === "NotAllowedError" || error.name === "SecurityError");
    showError(denied
      ? "Camera permission was denied. Allow access in the browser, or upload an image."
      : "Could not open the camera. Use Upload image instead.");
  }
}

function capturePhoto() {
  if (!camera.videoWidth || !camera.videoHeight) {
    showError("The camera is still starting. Try again in a moment.");
    return;
  }
  const maxEdge = 2600;
  const scale = Math.min(1, maxEdge / Math.max(camera.videoWidth, camera.videoHeight));
  canvas.width = Math.round(camera.videoWidth * scale);
  canvas.height = Math.round(camera.videoHeight * scale);
  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(camera, 0, 0, canvas.width, canvas.height);
  canvas.toBlob((blob) => {
    if (!blob) {
      showError("The photo could not be captured. Please try again.");
      return;
    }
    showSelectedImage(blob, `certificate-${Date.now()}.jpg`);
  }, "image/jpeg", 0.94);
}

function handleFile(file) {
  if (!file) return;
  if (file.size > 12 * 1024 * 1024) {
    showError("Image is too large. Choose a file smaller than 12 MB.");
    return;
  }
  if (!file.type.startsWith("image/")) {
    showError("Choose a JPG, PNG, WEBP, BMP, or TIFF image.");
    return;
  }
  showSelectedImage(file, file.name);
}

function setLoading(loading) {
  analyzeButton.disabled = loading || !selectedBlob;
  analyzeButton.classList.toggle("is-loading", loading);
  analyzeButton.querySelector(".button-label").textContent = loading
    ? "Reading certificate…"
    : "Extract & check document";
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderFields(fields) {
  const list = $("#fields-list");
  list.replaceChildren();
  Object.values(fields).forEach((field) => {
    const item = makeElement("div", "field-item");
    item.appendChild(makeElement("small", "", field.label));
    const valueRow = makeElement("div", "field-value");
    if (field.value) {
      const dotClass = field.confidence >= 0.75 ? "" : field.confidence >= 0.55 ? " medium" : " low";
      const dot = makeElement("span", `confidence-dot${dotClass}`);
      dot.title = `Extraction confidence ${Math.round(field.confidence * 100)}%`;
      valueRow.append(dot, makeElement("strong", "", field.value));
    } else {
      valueRow.appendChild(makeElement("strong", "not-found", "Not reliably found"));
    }
    item.appendChild(valueRow);
    list.appendChild(item);
  });
}

const checkSymbols = { pass: "✓", warn: "!", fail: "×", info: "i" };

function renderChecks(checks) {
  const list = $("#checks-list");
  list.replaceChildren();
  checks.forEach((check) => {
    const item = makeElement("div", `check-item ${check.status}`);
    item.append(
      makeElement("span", "check-symbol", checkSymbols[check.status] || "i"),
      makeElement("span", "check-label", check.label),
      makeElement("span", "check-detail", check.detail)
    );
    list.appendChild(item);
  });
}

function renderQr(qrItems) {
  const section = $("#qr-section");
  const list = $("#qr-list");
  list.replaceChildren();
  section.hidden = !qrItems.length;
  qrItems.forEach((qr) => {
    const item = makeElement("div", "qr-item");
    if (qr.official_url && qr.is_url) {
      const link = makeElement("a", "qr-value", qr.value);
      link.href = qr.value;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      item.appendChild(link);
    } else {
      item.appendChild(makeElement("span", "qr-value", qr.value));
    }
    item.appendChild(makeElement("span", "qr-note", qr.note));
    list.appendChild(item);
  });
}

function renderDiagnostics(report) {
  const row = $("#diagnostic-row");
  row.replaceChildren();
  const diagnostics = [
    `OCR ${report.ocr.confidence.toFixed(0)}%`,
    `${report.ocr.word_count} words`,
    `Language ${report.ocr.language}`,
    `${report.quality.width} × ${report.quality.height}px`,
    `Focus ${Math.round(report.quality.blur_variance)}`,
    report.document_detected ? "Page boundary found" : "Full frame used",
    report.processing.stored ? "Stored" : "Not stored"
  ];
  diagnostics.forEach((text) => row.appendChild(makeElement("span", "diagnostic-chip", text)));
  $("#ocr-text").textContent = report.ocr.text || "No text was extracted.";
}

function renderReport(report) {
  lastReport = report;
  const verification = report.verification;
  const verdict = $("#verdict-card");
  verdict.className = "verdict-card";
  const display = {
    ready_for_official_verification: { css: "status-ready", icon: "✓" },
    manual_review: { css: "status-review", icon: "!" },
    recapture_needed: { css: "status-recapture", icon: "↻" }
  }[verification.status] || { css: "status-review", icon: "i" };
  verdict.classList.add(display.css);
  $("#verdict-icon").textContent = display.icon;
  $("#verdict-title").textContent = verification.title;
  $("#verdict-summary").textContent = verification.summary;
  $("#completeness-value").textContent = `${verification.document_completeness_percent}%`;

  renderFields(report.fields);
  renderChecks(verification.checks);
  renderQr(verification.qr || []);
  renderDiagnostics(report);

  $("#official-instruction").textContent = verification.official_verification.instruction;
  const officialLink = $("#official-link");
  officialLink.href = verification.official_verification.portal_url;
  officialLink.textContent = `Open ${verification.official_verification.portal_name} ↗`;
  $("#decision-notice").textContent = verification.decision_notice;

  $("#results-empty").hidden = true;
  $("#results-content").hidden = false;
  $("#results-panel").classList.remove("empty-state");
  if (window.matchMedia("(max-width: 900px)").matches) {
    $("#results-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

async function analyzeImage() {
  if (!selectedBlob) {
    showError("Capture or choose an image first.");
    return;
  }
  clearError();
  setLoading(true);
  const form = new FormData();
  form.append("image", selectedBlob, selectedFilename);
  form.append("state", $("#state-select").value);
  try {
    const response = await fetch("/api/analyze", { method: "POST", body: form });
    let payload;
    try {
      payload = await response.json();
    } catch (_error) {
      payload = { error: "The server returned an unreadable response." };
    }
    if (!response.ok) {
      const help = payload.help ? ` ${payload.help}` : "";
      throw new Error((payload.error || "Analysis failed.") + help);
    }
    renderReport(payload);
  } catch (error) {
    showError(error.message || "Analysis failed. Please try a clearer image.");
  } finally {
    setLoading(false);
  }
}

function clearDocument() {
  stopCamera();
  releasePreviewUrl();
  selectedBlob = null;
  selectedFilename = "certificate.jpg";
  lastReport = null;
  preview.removeAttribute("src");
  preview.hidden = true;
  placeholder.hidden = false;
  fileInput.value = "";
  analyzeButton.disabled = true;
  clearError();
  $("#results-empty").hidden = false;
  $("#results-content").hidden = true;
  $("#results-panel").classList.add("empty-state");
}

function downloadReport() {
  if (!lastReport) return;
  const reportBlob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(reportBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `certificate-screening-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function checkHealth() {
  const banner = $("#health-banner");
  const text = $("#health-text");
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const health = await response.json();
    banner.classList.remove("is-loading");
    if (health.ocr.available) {
      banner.classList.add("is-ready");
      const hindi = health.ocr.languages.includes("hin") ? "English + Hindi" : "English";
      text.textContent = `Local OCR ready · ${hindi} · images are not saved`;
    } else {
      banner.classList.add("is-error");
      text.textContent = `OCR setup needed · ${health.ocr.message}`;
    }
  } catch (_error) {
    banner.classList.remove("is-loading");
    banner.classList.add("is-error");
    text.textContent = "Could not check OCR status.";
  }
}

startCameraButton.addEventListener("click", startCamera);
captureButton.addEventListener("click", capturePhoto);
fileInput.addEventListener("change", () => handleFile(fileInput.files[0]));
analyzeButton.addEventListener("click", analyzeImage);
$("#download-report").addEventListener("click", downloadReport);
$("#clear-button").addEventListener("click", clearDocument);
window.addEventListener("pagehide", stopCamera);
checkHealth();
