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

const previewOverlay = document.getElementById("previewOverlay");
const closePreviewOverlayBtn = document.getElementById("closePreviewOverlayBtn");
const backToEditBtn = document.getElementById("backToEditBtn");
const finalDownloadBtn = document.getElementById("finalDownloadBtn");

const modalTitle = document.getElementById("modalTitle");
const modalSub = document.getElementById("modalSub");
const modalPreview = document.getElementById("modalPreview");

const targetSizeInput = document.getElementById("targetSize");
const sizeUnitSelect = document.getElementById("sizeUnit");
const outputFormatSelect = document.getElementById("outputFormat");
const outputNameInput = document.getElementById("outputName");
const outputWidthInput = document.getElementById("outputWidth");
const outputHeightInput = document.getElementById("outputHeight");
const dimensionFieldWrap = document.getElementById("dimensionFieldWrap");

const originalInfo = document.getElementById("originalInfo");
const modeInfo = document.getElementById("modeInfo");

const resultPreviewVisual = document.getElementById("resultPreviewVisual");
const previewFileName = document.getElementById("previewFileName");
const previewFormat = document.getElementById("previewFormat");
const previewSize = document.getElementById("previewSize");
const previewDimensions = document.getElementById("previewDimensions");
const previewOriginal = document.getElementById("previewOriginal");

let uploadedFiles = [];
let activeFileId = null;
let lastPreviewResult = null;

init();

function init() {
  chooseBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    handleSelectedFiles(e.target.files);
  });

  dropzone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropzone.classList.add("dragover");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("dragover");
  });

  dropzone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropzone.classList.remove("dragover");
    handleSelectedFiles(e.dataTransfer.files);
  });

  clearAllBtn.addEventListener("click", clearAllFiles);

  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  previewBtn.addEventListener("click", buildPreview);

  closePreviewOverlayBtn.addEventListener("click", closePreviewOverlay);
  backToEditBtn.addEventListener("click", () => {
    closePreviewOverlay();
    modalOverlay.classList.remove("hidden");
  });

  previewOverlay.addEventListener("click", (e) => {
    if (e.target === previewOverlay) closePreviewOverlay();
  });

  finalDownloadBtn.addEventListener("click", () => {
    if (!lastPreviewResult || !lastPreviewResult.blob) {
      alert("Please generate preview first.");
      return;
    }
    triggerDownload(lastPreviewResult.blob, lastPreviewResult.fileName);
    closePreviewOverlay();
    closeModal();
  });

  renderFiles();
}

function handleSelectedFiles(fileList) {
  if (!fileList || !fileList.length) return;

  const incoming = Array.from(fileList);
  const supported = incoming.filter(file =>
    IMAGE_TYPES.includes(file.type) || file.type === PDF_TYPE
  );

  if (supported.length !== incoming.length) {
    alert("Only JPG, PNG, WEBP and PDF files are supported.");
  }

  if (uploadedFiles.length + supported.length > MAX_FILES) {
    alert(`You can upload a maximum of ${MAX_FILES} files.`);
    fileInput.value = "";
    return;
  }

  const currentTotal = uploadedFiles.reduce((sum, f) => sum + f.file.size, 0);
  const incomingTotal = supported.reduce((sum, f) => sum + f.size, 0);

  if (currentTotal + incomingTotal > MAX_TOTAL_SIZE) {
    alert("Total upload size cannot exceed 10 MB.");
    fileInput.value = "";
    return;
  }

  supported.forEach(file => {
    const isImage = IMAGE_TYPES.includes(file.type);
    uploadedFiles.push({
      id: createId(),
      file,
      typeCategory: isImage ? "image" : "pdf",
      previewUrl: isImage ? URL.createObjectURL(file) : null
    });
  });

  fileInput.value = "";
  renderFiles();
}

function clearAllFiles() {
  uploadedFiles.forEach(item => {
    if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  });
  uploadedFiles = [];
  renderFiles();
}

function removeFile(id) {
  const item = uploadedFiles.find(f => f.id === id);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  uploadedFiles = uploadedFiles.filter(f => f.id !== id);
  renderFiles();
}

function renderFiles() {
  fileGrid.innerHTML = "";

  fileCountEl.textContent = `${uploadedFiles.length} / ${MAX_FILES}`;
  totalSizeEl.textContent = `${formatBytes(uploadedFiles.reduce((sum, f) => sum + f.file.size, 0))} / 10 MB`;

  if (!uploadedFiles.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  uploadedFiles.forEach(item => {
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
      renderPdfThumbnail(item.file, previewBox, item.file.name);
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

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn primary";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => openModal(item.id));

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeFile(item.id));

    actions.appendChild(downloadBtn);
    actions.appendChild(removeBtn);

    meta.appendChild(fileName);
    meta.appendChild(fileSize);
    meta.appendChild(actions);

    card.appendChild(previewBox);
    card.appendChild(meta);

    fileGrid.appendChild(card);
  });
}

function openModal(fileId) {
  const item = uploadedFiles.find(f => f.id === fileId);
  if (!item) return;

  activeFileId = fileId;
  lastPreviewResult = null;

  modalTitle.textContent = "Download Settings";
  modalSub.textContent = item.file.name;

  targetSizeInput.value = "";
  sizeUnitSelect.value = "KB";
  outputNameInput.value = "";
  outputWidthInput.value = "";
  outputHeightInput.value = "";

  originalInfo.textContent = `${item.file.name} • ${formatBytes(item.file.size)} • ${item.file.type}`;

  setupOutputFormats(item);

  if (item.typeCategory === "image") {
    modeInfo.textContent = "Image: JPG / PNG / WEBP / PDF + resize + compress";
    dimensionFieldWrap.style.display = "flex";
    dimensionFieldWrap.style.flexDirection = "column";
  } else {
    modeInfo.textContent = "PDF: PDF / JPG / PNG / WEBP";
    dimensionFieldWrap.style.display = "none";
  }

  renderModalPreview(item);
  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalPreview.innerHTML = "";
  activeFileId = null;
}

function closePreviewOverlay() {
  previewOverlay.classList.add("hidden");
  resultPreviewVisual.innerHTML = "";
}

function setupOutputFormats(item) {
  outputFormatSelect.innerHTML = "";

  let formats = [];
  if (item.typeCategory === "image") {
    formats = [
      ["jpeg", "JPG / JPEG"],
      ["png", "PNG"],
      ["webp", "WEBP"],
      ["pdf", "PDF"]
    ];
  } else {
    formats = [
      ["pdf", "PDF"],
      ["jpeg", "JPG / JPEG"],
      ["png", "PNG"],
      ["webp", "WEBP"]
    ];
  }

  formats.forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    outputFormatSelect.appendChild(option);
  });
}

function renderModalPreview(item) {
  modalPreview.innerHTML = "";

  if (item.typeCategory === "image") {
    const img = document.createElement("img");
    img.src = item.previewUrl;
    img.alt = item.file.name;
    modalPreview.appendChild(img);
  } else {
    renderPdfThumbnail(item.file, modalPreview, item.file.name, true);
  }
}

async function renderPdfThumbnail(file, container, fileName = "PDF File", big = false) {
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

    const viewport = page.getViewport({ scale: big ? 1.2 : 0.7 });
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

    const label = document.createElement("div");
    label.className = "pdf-file-label";
    label.textContent = fileName;

    wrap.appendChild(canvas);
    wrap.appendChild(label);

    container.appendChild(wrap);
  } catch (err) {
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
  const item = uploadedFiles.find(f => f.id === activeFileId);
  if (!item) return;

  try {
    previewBtn.disabled = true;
    previewBtn.textContent = "Preparing...";

    const targetValue = parseFloat(targetSizeInput.value);
    const targetBytes = Number.isFinite(targetValue)
      ? convertToBytes(targetValue, sizeUnitSelect.value)
      : null;

    const settings = {
      outputFormat: outputFormatSelect.value,
      targetBytes,
      customName: outputNameInput.value.trim(),
      width: parsePositiveInt(outputWidthInput.value),
      height: parsePositiveInt(outputHeightInput.value)
    };

    let result;
    if (item.typeCategory === "image") {
      result = await processImageFile(item.file, settings);
    } else {
      result = await processPdfFile(item.file, settings);
    }

    lastPreviewResult = result;
    renderFinalPreview(item, result);

    modalOverlay.classList.add("hidden");
    previewOverlay.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Preview generation failed.");
  } finally {
    previewBtn.disabled = false;
    previewBtn.textContent = "Preview";
  }
}

function renderFinalPreview(originalItem, result) {
  resultPreviewVisual.innerHTML = "";

  previewFileName.textContent = result.fileName;
  previewFormat.textContent = result.formatLabel;
  previewSize.textContent = formatBytes(result.blob.size);
  previewDimensions.textContent = result.dimensionsText || "-";
  previewOriginal.textContent = `${originalItem.file.name} • ${formatBytes(originalItem.file.size)}`;

  if (result.previewType === "image" && result.previewUrl) {
    const img = document.createElement("img");
    img.src = result.previewUrl;
    img.alt = result.fileName;
    resultPreviewVisual.appendChild(img);
  } else {
    resultPreviewVisual.innerHTML = `
      <div class="pdf-placeholder">
        <div class="pdf-icon">📄</div>
        <div>${escapeHtml(result.formatLabel)} Ready</div>
        <div class="pdf-file-label">${escapeHtml(result.fileName)}</div>
      </div>
    `;
  }
}

async function processImageFile(file, settings) {
  const { outputFormat, targetBytes, customName, width, height } = settings;
  const img = await loadImageFromFile(file);
  const finalDimensions = calculateOutputDimensions(img.width, img.height, width, height);

  if (outputFormat === "pdf") {
    const blob = await imageToPdfBlob(img, finalDimensions.width, finalDimensions.height, targetBytes);
    return {
      blob,
      fileName: buildOutputName(customName, file.name, "pdf"),
      previewType: "pdf",
      formatLabel: "PDF",
      dimensionsText: `${finalDimensions.width} × ${finalDimensions.height}px`
    };
  }

  const blob = await processImageToTarget(file, outputFormat, targetBytes, finalDimensions.width, finalDimensions.height);
  return {
    blob,
    fileName: buildOutputName(customName, file.name, outputFormat === "jpeg" ? "jpg" : outputFormat),
    previewType: "image",
    previewUrl: URL.createObjectURL(blob),
    formatLabel: outputFormat.toUpperCase(),
    dimensionsText: `${finalDimensions.width} × ${finalDimensions.height}px`
  };
}

async function processPdfFile(file, settings) {
  const { outputFormat, targetBytes, customName } = settings;

  if (outputFormat === "pdf") {
    return processPdfToPdf(file, targetBytes, customName);
  } else {
    return processPdfToImage(file, outputFormat, targetBytes, customName);
  }
}

async function processPdfToPdf(file, targetBytes, customName = "") {
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
    const viewport = page.getViewport({ scale: 1.1 });
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

  return {
    blob: doc.output("blob"),
    fileName: buildOutputName(customName, file.name, "pdf"),
    previewType: "pdf",
    formatLabel: "PDF",
    dimensionsText: `${pageCount} page(s)`
  };
}

async function processPdfToImage(file, outputFormat, targetBytes, customName = "") {
  if (!window.pdfjsLib) throw new Error("PDF library not loaded");

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  let width, height;
  let quality = 0.92;

  const viewport = page.getViewport({ scale: 2 });
  const sourceCanvas = document.createElement("canvas");
  const sourceCtx = sourceCanvas.getContext("2d");
  sourceCanvas.width = viewport.width;
  sourceCanvas.height = viewport.height;

  await page.render({ canvasContext: sourceCtx, viewport }).promise;

  width = sourceCanvas.width;
  height = sourceCanvas.height;

  let blob = await canvasToBlob(sourceCanvas, outputFormat, quality);

  if (targetBytes) {
    let attempts = 0;
    let bestBlob = blob;
    let bestDiff = Math.abs(blob.size - targetBytes);

    while (attempts < 18) {
      if (Math.abs(blob.size - targetBytes) <= Math.max(12 * 1024, targetBytes * 0.08)) {
        bestBlob = blob;
        break;
      }

      if (blob.size > targetBytes) {
        if (outputFormat === "png") {
          width = Math.max(100, Math.floor(width * 0.92));
          height = Math.max(100, Math.floor(height * 0.92));
        } else {
          quality = Math.max(0.08, quality - 0.06);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(sourceCanvas, 0, 0, width, height);

      blob = await canvasToBlob(canvas, outputFormat, quality);

      const diff = Math.abs(blob.size - targetBytes);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestBlob = blob;
      }

      attempts++;
    }

    blob = bestBlob;
  }

  return {
    blob,
    fileName: buildOutputName(customName, file.name, outputFormat === "jpeg" ? "jpg" : outputFormat),
    previewType: "image",
    previewUrl: URL.createObjectURL(blob),
    formatLabel: outputFormat.toUpperCase(),
    dimensionsText: `${width} × ${height}px (PDF page 1)`
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
    if (Math.abs(blob.size - targetBytes) <= Math.max(12 * 1024, targetBytes * 0.08)) {
      bestBlob = blob;
      break;
    }

    if (blob.size > targetBytes) {
      if (outputFormat === "png") {
        width = Math.max(100, Math.floor(width * 0.92));
        height = Math.max(100, Math.floor(height * 0.92));
      } else {
        quality = Math.max(0.08, quality - 0.06);
      }
    }

    blob = await canvasExport(img, width, height, outputFormat, quality);

    const diff = Math.abs(blob.size - targetBytes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = blob;
    }

    attempts++;
  }

  return bestBlob;
}

async function imageToPdfBlob(img, width, height, targetBytes = null) {
  if (!window.jspdf) throw new Error("jsPDF not loaded");
  const { jsPDF } = window.jspdf;

  const doc = new jsPDF(
