const MAX_FILES = 20;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10MB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PDF_TYPE = "application/pdf";

const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropzone = document.getElementById("dropzone");
const fileGrid = document.getElementById("fileGrid");
const emptyState = document.getElementById("emptyState");
const fileCountEl = document.getElementById("fileCount");
const totalSizeEl = document.getElementById("totalSize");
const clearAllBtn = document.getElementById("clearAllBtn");

const modalOverlay = document.getElementById("modalOverlay");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const previewBtn = document.getElementById("previewBtn");
const downloadBtn = document.getElementById("downloadBtn");

const modalTitle = document.getElementById("modalTitle");
const modalSub = document.getElementById("modalSub");
const modalPreview = document.getElementById("modalPreview");

const targetSizeInput = document.getElementById("targetSize");
const sizeUnitSelect = document.getElementById("sizeUnit");
const outputFormatSelect = document.getElementById("outputFormat");
const outputNameInput = document.getElementById("outputName");
const outputWidthInput = document.getElementById("outputWidth");
const outputHeightInput = document.getElementById("outputHeight");
const widthFieldWrap = document.getElementById("widthFieldWrap");
const heightFieldWrap = document.getElementById("heightFieldWrap");

const originalInfo = document.getElementById("originalInfo");
const modeInfo = document.getElementById("modeInfo");

const resultPreviewBox = document.getElementById("resultPreviewBox");
const resultPreviewVisual = document.getElementById("resultPreviewVisual");
const previewFileName = document.getElementById("previewFileName");
const previewFormat = document.getElementById("previewFormat");
const previewSize = document.getElementById("previewSize");
const previewDimensions = document.getElementById("previewDimensions");
const previewOriginal = document.getElementById("previewOriginal");
const resultStatus = document.getElementById("resultStatus");

let uploadedFiles = [];
let activeFileId = null;
let lastPreviewResult = null;

chooseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => handleSelectedFiles(e.target.files));

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleSelectedFiles(e.dataTransfer.files);
});

clearAllBtn.addEventListener("click", () => {
  uploadedFiles.forEach(f => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  });
  uploadedFiles = [];
  renderFiles();
});

closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

previewBtn.addEventListener("click", async () => {
  await buildPreview();
});

downloadBtn.addEventListener("click", async () => {
  try {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Processing...";

    // अगर preview पहले नहीं किया गया, तो पहले preview बनाओ
    if (!lastPreviewResult) {
      await buildPreview();
    }

    if (!lastPreviewResult || !lastPreviewResult.blob) {
      throw new Error("No preview result available");
    }

    triggerDownload(lastPreviewResult.blob, lastPreviewResult.fileName);
    closeModal();
  } catch (err) {
    console.error(err);
    alert("Download failed. Please try preview once and check settings.");
  } finally {
    downloadBtn.disabled = false;
    downloadBtn.textContent = "Download";
  }
});

function handleSelectedFiles(fileList) {
  if (!fileList || !fileList.length) return;

  const incoming = Array.from(fileList);
  const supported = incoming.filter((file) => {
    return IMAGE_TYPES.includes(file.type) || file.type === PDF_TYPE;
  });

  if (supported.length !== incoming.length) {
    alert("Only JPG, PNG, WEBP and PDF files are supported in this version.");
  }

  if (uploadedFiles.length + supported.length > MAX_FILES) {
    alert(`You can upload a maximum of ${MAX_FILES} files.`);
    return;
  }

  const currentTotal = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0);
  const newTotal = supported.reduce((sum, f) => sum + f.size, currentTotal);

  if (newTotal > MAX_TOTAL_SIZE) {
    alert("Total upload size cannot exceed 10 MB.");
    return;
  }

  supported.forEach((file) => {
    const id = crypto.randomUUID();
    const typeCategory = IMAGE_TYPES.includes(file.type) ? "image" : "pdf";

    uploadedFiles.push({
      id,
      file,
      typeCategory,
      previewUrl: typeCategory === "image" ? URL.createObjectURL(file) : null
    });
  });

  fileInput.value = "";
  renderFiles();
}

function renderFiles() {
  fileGrid.innerHTML = "";
  fileCountEl.textContent = `${uploadedFiles.length} / ${MAX_FILES}`;
  totalSizeEl.textContent = `${formatBytes(
    uploadedFiles.reduce((sum, f) => sum + f.file.size, 0)
  )} / 10 MB`;

  if (!uploadedFiles.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  uploadedFiles.forEach((item) => {
    const card = document.createElement("div");
    card.className = "file-card";

    const previewBox = document.createElement("div");
    previewBox.className = "preview-box";

    const badge = document.createElement("div");
    badge.className = "file-type-badge";
    badge.textContent = item.typeCategory.toUpperCase();
    previewBox.appendChild(badge);

    if (item.typeCategory === "image") {
      const img = document.createElement("img");
      img.src = item.previewUrl;
      img.alt = item.file.name;
      previewBox.appendChild(img);
    } else {
      renderPdfThumbnail(item.file, previewBox, false, item.file.name);
    }

    const meta = document.createElement("div");
    meta.className = "file-meta";

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = item.file.name;

    const fileSize = document.createElement("div");
    fileSize.className = "file-size";
    fileSize.textContent = `${formatBytes(item.file.size)} • ${item.file.type || "unknown"}`;

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn primary";
    openBtn.textContent = "Download";
    openBtn.addEventListener("click", () => openModal(item.id));

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeFile(item.id));

    actions.appendChild(openBtn);
    actions.appendChild(removeBtn);

    meta.appendChild(fileName);
    meta.appendChild(fileSize);
    meta.appendChild(actions);

    card.appendChild(previewBox);
    card.appendChild(meta);

    fileGrid.appendChild(card);
  });
}

function removeFile(id) {
  const item = uploadedFiles.find((f) => f.id === id);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  uploadedFiles = uploadedFiles.filter((f) => f.id !== id);
  renderFiles();
}

function openModal(fileId) {
  activeFileId = fileId;
  lastPreviewResult = null;
  resetResultPreview();

  const item = uploadedFiles.find((f) => f.id === fileId);
  if (!item) return;

  modalTitle.textContent = "Download Settings";
  modalSub.textContent = item.file.name;
  outputNameInput.value = "";
  targetSizeInput.value = "";
  sizeUnitSelect.value = "KB";
  outputWidthInput.value = "";
  outputHeightInput.value = "";

  originalInfo.textContent = `${item.file.name} • ${formatBytes(item.file.size)} • ${item.file.type}`;

  if (item.typeCategory === "image") {
    modeInfo.textContent = "Image: compression + conversion + image to PDF + rename + optional width/height";
    widthFieldWrap.classList.remove("hidden");
    heightFieldWrap.classList.remove("hidden");
  } else {
    modeInfo.textContent = "PDF: preview + PDF export + rename";
    widthFieldWrap.classList.add("hidden");
    heightFieldWrap.classList.add("hidden");
  }

  setupOutputFormats(item);
  renderModalPreview(item);

  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalPreview.innerHTML = "";
  activeFileId = null;
  lastPreviewResult = null;
  resetResultPreview();
}

function resetResultPreview() {
  resultPreviewBox.classList.add("hidden");
  resultPreviewVisual.innerHTML = "";
  previewFileName.textContent = "-";
  previewFormat.textContent = "-";
  previewSize.textContent = "-";
  previewDimensions.textContent = "-";
  previewOriginal.textContent = "-";
  resultStatus.textContent = "Ready";
}

function setupOutputFormats(item) {
  outputFormatSelect.innerHTML = "";

  if (item.typeCategory === "image") {
    const formats = [
      { value: "jpeg", label: "JPG / JPEG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WEBP" },
      { value: "pdf", label: "PDF" }
    ];

    formats.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.value;
      opt.textContent = f.label;
      outputFormatSelect.appendChild(opt);
    });

    if (item.file.type === "image/png") outputFormatSelect.value = "png";
    else if (item.file.type === "image/webp") outputFormatSelect.value = "webp";
    else outputFormatSelect.value = "jpeg";
  } else {
    const opt = document.createElement("option");
    opt.value = "pdf";
    opt.textContent = "PDF";
    outputFormatSelect.appendChild(opt);
  }
}

function renderModalPreview(item) {
  modalPreview.innerHTML = "";

  if (item.typeCategory === "image") {
    const img = document.createElement("img");
    img.src = item.previewUrl;
    img.alt = item.file.name;
    modalPreview.appendChild(img);
  } else {
    renderPdfThumbnail(item.file, modalPreview, true, item.file.name);
  }
}

async function renderPdfThumbnail(file, container, bigger = false, fileName = "PDF File") {
  container.innerHTML = "";

  if (!window.pdfjsLib) {
    container.innerHTML = `
      <div class="pdf-placeholder">
        <div class="pdf-icon">📄</div>
        <div>PDF File</div>
        <div class="pdf-file-label">${escapeHtml(fileName)}</div>
      </div>
    `;
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: bigger ? 1.2 : 0.7 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const wrap = document.createElement("div");
    wrap.style.width = "100%";
    wrap.style.height = "100%";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    wrap.style.gap = "8px";

    const badge = document.createElement("div");
    badge.className = "file-type-badge";
    badge.style.position = "static";
    badge.textContent = "PDF";

    const label = document.createElement("div");
    label.className = "pdf-file-label";
    label.textContent = fileName;

    wrap.appendChild(badge);
    wrap.appendChild(canvas);
    wrap.appendChild(label);

    container.innerHTML = "";
    container.appendChild(wrap);
  } catch (e) {
    console.warn("PDF preview failed", e);
    container.innerHTML = `
      <div class="pdf-placeholder">
        <div class="pdf-icon">📄</div>
        <div>PDF File</div>
        <div class="pdf-file-label">${escapeHtml(fileName)}</div>
      </div>
    `;
  }
}

async function buildPreview() {
  const item = uploadedFiles.find((f) => f.id === activeFileId);
  if (!item) return;

  try {
    previewBtn.disabled = true;
    previewBtn.textContent = "Preparing...";
    resultStatus.textContent = "Processing...";

    const customName = outputNameInput.value.trim();
    const targetValue = parseFloat(targetSizeInput.value);
    const targetBytes = !isNaN(targetValue) ? convertToBytes(targetValue, sizeUnitSelect.value) : null;
    const outputFormat = outputFormatSelect.value;
    const width = parsePositiveInt(outputWidthInput.value);
    const height = parsePositiveInt(outputHeightInput.value);

    let result;

    if (item.typeCategory === "image") {
      result = await processImageFile(item.file, {
        outputFormat,
        targetBytes,
        width,
        height,
        customName
      });
    } else {
      result = await processPdf(item.file, targetBytes, customName);
    }

    lastPreviewResult = result;
    renderResultPreview(item, result);
  } catch (err) {
    console.error(err);
    alert("Preview generation failed. Try smaller size or different settings.");
    resultStatus.textContent = "Failed";
  } finally {
    previewBtn.disabled = false;
    previewBtn.textContent = "Preview";
  }
}

function renderResultPreview(originalItem, result) {
  resultPreviewBox.classList.remove("hidden");
  resultPreviewVisual.innerHTML = "";

  previewFileName.textContent = result.fileName;
  previewFormat.textContent = result.formatLabel;
  previewSize.textContent = formatBytes(result.blob.size);
  previewDimensions.textContent = result.dimensionsText || "-";
  previewOriginal.textContent = `${originalItem.file.name} • ${formatBytes(originalItem.file.size)}`;
  resultStatus.textContent = "Ready";

  if (result.previewType === "image" && result.previewUrl) {
    const img = document.createElement("img");
    img.src = result.previewUrl;
    img.alt = result.fileName;
    resultPreviewVisual.appendChild(img);
  } else if (result.previewType === "pdf") {
    resultPreviewVisual.innerHTML = `
      <div class="pdf-placeholder">
        <div class="pdf-icon">📄</div>
        <div>PDF Ready</div>
        <div class="pdf-file-label">${escapeHtml(result.fileName)}</div>
      </div>
    `;
  } else {
    resultPreviewVisual.innerHTML = `<div class="pdf-placeholder"><div>Preview not available</div></div>`;
  }
}

async function processImageFile(file, options) {
  const { outputFormat, targetBytes, width, height, customName } = options;
  const img = await loadImageFromFile(file);

  const finalDimensions = calculateOutputDimensions(img.width, img.height, width, height);

  if (outputFormat === "pdf") {
    const blob = await imageToPdfBlob(img, finalDimensions.width, finalDimensions.height, targetBytes);
    const fileName = buildOutputName(customName, file.name, "pdf");

    return {
      blob,
      fileName,
      previewType: "pdf",
      formatLabel: "PDF",
      dimensionsText: `${finalDimensions.width} × ${finalDimensions.height}px`
    };
  }

  const resultBlob = await processImageToTarget(file, outputFormat, targetBytes, finalDimensions.width, finalDimensions.height);
  const fileName = buildOutputName(customName, file.name, outputFormat);
  const previewUrl = URL.createObjectURL(resultBlob);

  return {
    blob: resultBlob,
    fileName,
    previewType: "image",
    previewUrl,
    formatLabel: outputFormat.toUpperCase(),
    dimensionsText: `${finalDimensions.width} × ${finalDimensions.height}px`
  };
}

async function processImageToTarget(file, outputFormat, targetBytes, forcedWidth = null, forcedHeight = null) {
  const img = await loadImageFromFile(file);

  let width = forcedWidth || img.width;
  let height = forcedHeight || img.height;
  let quality = 0.92;

  let blob = await canvasExport(img, width, height, outputFormat, quality);

  if (!targetBytes) return blob;

  let attempts = 0;
  let bestBlob = blob;
  let bestDiff = Math.abs(blob.size - targetBytes);

  while (attempts < 22) {
    const diff = blob.size - targetBytes;
    const tolerance = Math.max(12 * 1024, targetBytes * 0.08);

    if (Math.abs(diff) <= tolerance) {
      bestBlob = blob;
      break;
    }

    if (blob.size > targetBytes) {
      if (outputFormat === "png") {
        width = Math.max(100, Math.floor(width * 0.92));
        height = Math.max(100, Math.floor(height * 0.92));
      } else {
        quality = Math.max(0.08, quality - 0.06);
        if (quality <= 0.28) {
          width = Math.max(100, Math.floor(width * 0.95));
          height = Math.max(100, Math.floor(height * 0.95));
        }
      }
    } else {
      if (outputFormat !== "png" && quality < 0.98) {
        quality = Math.min(0.98, quality + 0.03);
      } else {
        width = Math.floor(width * 1.03);
        height = Math.floor(height * 1.03);
      }
    }

    blob = await canvasExport(img, width, height, outputFormat, quality);

    const currentDiff = Math.abs(blob.size - targetBytes);
    if (currentDiff < bestDiff) {
      bestDiff = currentDiff;
      bestBlob = blob;
    }

    attempts++;
  }

  return bestBlob;
}

async function processPdf(file, targetBytes, customName = "") {
  if (!window.pdfjsLib || !window.jspdf) {
    return {
      blob: file,
      fileName: buildOutputName(customName, file.name, "pdf"),
      previewType: "pdf",
      formatLabel: "PDF",
      dimensionsText: "-"
    };
  }

  const { jsPDF } = window.jspdf;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const baseScale = targetBytes ? 1.0 : 1.3;
    const viewport = page.getViewport({ scale: baseScale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    let quality = 0.82;
    if (targetBytes) {
      if (targetBytes < 300 * 1024) quality = 0.42;
      else if (targetBytes < 700 * 1024) quality = 0.58;
      else quality = 0.72;
    }

    const imgData = canvas.toDataURL("image/jpeg", quality);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    if (i > 1) doc.addPage();
    doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  const blob = doc.output("blob");
  const fileName = buildOutputName(customName, file.name, "pdf");

  return {
    blob,
    fileName,
    previewType: "pdf",
    formatLabel: "PDF",
    dimensionsText: `${pageCount} page(s)`
  };
}

async function imageToPdfBlob(img, width, height, targetBytes = null) {
  if (!window.jspdf) throw new Error("jsPDF not loaded");
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: width >= height ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
    compress: true
  });

  let quality = 0.9;
  if (targetBytes) {
    if (targetBytes < 250 * 1024) quality = 0.42;
    else if (targetBytes < 600 * 1024) quality = 0.58;
    else if (targetBytes < 1024 * 1024) quality = 0.72;
    else quality = 0.85;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = width;
  tempCanvas.height = height;
  const ctx = tempCanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const imgData = tempCanvas.toDataURL("image/jpeg", quality);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getH
