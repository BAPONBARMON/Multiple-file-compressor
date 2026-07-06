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
const downloadAllBtn = document.getElementById("downloadAllBtn");
const downloadZipBtn = document.getElementById("downloadZipBtn");
const applyAllBtn = document.getElementById("applyAllBtn");

const modalOverlay = document.getElementById("modalOverlay");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");
const previewBtn = document.getElementById("previewBtn");
const applyCurrentToAllBtn = document.getElementById("applyCurrentToAllBtn");

const previewOverlay = document.getElementById("previewOverlay");
const closePreviewOverlayBtn = document.getElementById("closePreviewOverlayBtn");
const backToEditBtn = document.getElementById("backToEditBtn");
const finalDownloadBtn = document.getElementById("finalDownloadBtn");

const bulkOverlay = document.getElementById("bulkOverlay");
const closeBulkOverlayBtn = document.getElementById("closeBulkOverlayBtn");
const cancelBulkBtn = document.getElementById("cancelBulkBtn");
const saveBulkBtn = document.getElementById("saveBulkBtn");

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

const bulkTargetSize = document.getElementById("bulkTargetSize");
const bulkSizeUnit = document.getElementById("bulkSizeUnit");
const bulkOutputFormat = document.getElementById("bulkOutputFormat");
const bulkOutputWidth = document.getElementById("bulkOutputWidth");
const bulkOutputHeight = document.getElementById("bulkOutputHeight");
const bulkNamePrefix = document.getElementById("bulkNamePrefix");

let uploadedFiles = [];
let activeFileId = null;
let lastPreviewResult = null;
let bulkSettings = null;

function init() {
  // choose files bug fix: multiple reliable triggers
  chooseBtn.addEventListener("click", openFilePickerSafely);
  dropzone.addEventListener("click", (e) => {
    if (e.target.closest(".btn") || e.target.closest("label")) return;
    openFilePickerSafely();
  });
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePickerSafely();
    }
  });

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

  clearAllBtn.addEventListener("click", clearAllFiles);
  downloadAllBtn.addEventListener("click", downloadAllProcessed);
  downloadZipBtn.addEventListener("click", downloadAllAsZip);
  applyAllBtn.addEventListener("click", () => bulkOverlay.classList.remove("hidden"));

  closeModalBtn.addEventListener("click", closeModal);
  cancelBtn.addEventListener("click", closeModal);
  previewBtn.addEventListener("click", buildPreview);
  applyCurrentToAllBtn.addEventListener("click", applyCurrentSettingsToAll);

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  closePreviewOverlayBtn.addEventListener("click", closePreviewOverlay);
  backToEditBtn.addEventListener("click", () => {
    closePreviewOverlay();
    modalOverlay.classList.remove("hidden");
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

  previewOverlay.addEventListener("click", (e) => {
    if (e.target === previewOverlay) closePreviewOverlay();
  });

  closeBulkOverlayBtn.addEventListener("click", closeBulkModal);
  cancelBulkBtn.addEventListener("click", closeBulkModal);
  saveBulkBtn.addEventListener("click", saveBulkSettings);
  bulkOverlay.addEventListener("click", (e) => {
    if (e.target === bulkOverlay) closeBulkModal();
  });

  renderFiles();
}
init();

function openFilePickerSafely() {
  try {
    fileInput.value = "";
    fileInput.click();
  } catch (err) {
    console.error("File picker open failed:", err);
  }
}

function clearAllFiles() {
  uploadedFiles.forEach(f => {
    if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
  });
  uploadedFiles = [];
  renderFiles();
}

function handleSelectedFiles(fileList) {
  if (!fileList || !fileList.length) return;

  const incoming = Array.from(fileList);
  const supported = incoming.filter((file) => {
    return IMAGE_TYPES.includes(file.type) || file.type === PDF_TYPE;
  });

  if (supported.length !== incoming.length) {
    alert("Only JPG, PNG, WEBP and PDF files are supported.");
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
      previewUrl: typeCategory === "image" ? URL.createObjectURL(file) : null,
      savedSettings: null
    });
  });

  fileInput.value = "";
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

    const extra = document.createElement("div");
    extra.className = "file-extra";
    extra.textContent = item.savedSettings ? "Custom settings saved" : "No saved custom settings";

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "btn primary";
    openBtn.textContent = "Download";
    openBtn.addEventListener("click", () => openModal(item.id));

    const quickBtn = document.createElement("button");
    quickBtn.className = "btn ghost";
    quickBtn.textContent = "Quick";
    quickBtn.addEventListener("click", async () => {
      try {
        const settings = getEffectiveSettings(item);
        const result = await processItem(item, settings);
        triggerDownload(result.blob, result.fileName);
      } catch (e) {
        console.error(e);
        alert("Quick download failed.");
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeFile(item.id));

    actions.appendChild(openBtn);
    actions.appendChild(quickBtn);
    actions.appendChild(removeBtn);

    meta.appendChild(fileName);
    meta.appendChild(fileSize);
    meta.appendChild(extra);
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

  const item = uploadedFiles.find((f) => f.id === fileId);
  if (!item) return;

  modalTitle.textContent = "Download Settings";
  modalSub.textContent = item.file.name;

  const defaults = getEffectiveSettings(item);

  targetSizeInput.value = defaults.targetValue ?? "";
  sizeUnitSelect.value = defaults.sizeUnit || "KB";
  outputNameInput.value = defaults.customName || "";
  outputWidthInput.value = defaults.width || "";
  outputHeightInput.value = defaults.height || "";

  originalInfo.textContent = `${item.file.name} • ${formatBytes(item.file.size)} • ${item.file.type}`;

  if (item.typeCategory === "image") {
    modeInfo.textContent = "Image: compression + JPG/PNG/WEBP/PDF convert + rename + width/height";
    dimensionFieldWrap.classList.remove("hidden");
  } else {
    modeInfo.textContent = "PDF: PDF/JPG/PNG/WEBP convert + rename";
    dimensionFieldWrap.classList.add("hidden");
  }

  setupOutputFormats(item);
  outputFormatSelect.value = defaults.outputFormat || getDefaultOutputFormat(item);
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

function closeBulkModal() {
  bulkOverlay.classList.add("hidden");
}

function getDefaultOutputFormat(item) {
  if (item.typeCategory === "image") {
    if (item.file.type === "image/png") return "png";
    if (item.file.type === "image/webp") return "webp";
    return "jpeg";
  }
  return "pdf";
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
  } else {
    const formats = [
      { value: "pdf", label: "PDF" },
      { value: "jpeg", label: "JPG / JPEG" },
      { value: "png", label: "PNG" },
      { value: "webp", label: "WEBP" }
    ];
    formats.forEach((f) => {
      const opt = document.createElement("option");
      opt.value = f.value;
      opt.textContent = f.label;
      outputFormatSelect.appendChild(opt);
    });
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

    const label = document.createElement("div");
    label.className = "pdf-file-label";
    label.textContent = fileName;

    wrap.appendChild(canvas);
    wrap.appendChild(label);

    container.innerHTML = "";
    container.appendChild(wrap);
  } catch (e) {
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

    const settings = collectSettingsFromModal(item);
    const result = await processItem(item, settings);

    lastPreviewResult = result;
    renderFinalPreview(item, result);

    modalOverlay.classList.add("hidden");
    previewOverlay.classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Preview generation failed. Try different settings.");
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

function collectSettingsFromModal(item) {
  const targetValue = parseFloat(targetSizeInput.value);
  return {
    outputFormat: outputFormatSelect.value,
    targetValue: !isNaN(targetValue) ? targetValue : null,
    sizeUnit: sizeUnitSelect.value,
    targetBytes: !isNaN(targetValue) ? convertToBytes(targetValue, sizeUnitSelect.value) : null,
    customName: outputNameInput.value.trim(),
    width: item.typeCategory === "image" ? parsePositiveInt(outputWidthInput.value) : null,
    height: item.typeCategory === "image" ? parsePositiveInt(outputHeightInput.value) : null
  };
}

function applyCurrentSettingsToAll() {
  const item = uploadedFiles.find((f) => f.id === activeFileId);
  if (!item) return;

  const settings = collectSettingsFromModal(item);
  bulkSettings = {
    targetValue: settings.targetValue,
    sizeUnit: settings.sizeUnit,
    outputFormat: settings.outputFormat,
    width: settings.width,
    height: settings.height,
    customNamePrefix: settings.customName || ""
  };

  alert("Current settings saved as bulk settings for all files.");
}

function saveBulkSettings() {
  const targetValue = parseFloat(bulkTargetSize.value);
  bulkSettings = {
    targetValue: !isNaN(targetValue) ? targetValue : null,
    sizeUnit: bulkSizeUnit.value,
    outputFormat: bulkOutputFormat.value || null,
    width: parsePositiveInt(bulkOutputWidth.value),
    height: parsePositiveInt(bulkOutputHeight.value),
    customNamePrefix: bulkNamePrefix.value.trim()
  };
  closeBulkModal();
  alert("Bulk settings saved.");
}

function getEffectiveSettings(item) {
  const itemSaved = item.savedSettings || {};
  const bulk = bulkSettings || {};

  const outputFormat = itemSaved.outputFormat || bulk.outputFormat || getDefaultOutputFormat(item);

  return {
    outputFormat,
    targetValue: itemSaved.targetValue ?? bulk.targetValue ?? null,
    sizeUnit: itemSaved.sizeUnit || bulk.sizeUnit || "KB",
    targetBytes:
      (itemSaved.targetValue ?? bulk.targetValue) != null
        ? convertToBytes(
            itemSaved.targetValue ?? bulk.targetValue,
            itemSaved.sizeUnit || bulk.sizeUnit || "KB"
          )
        : null,
    customName: itemSaved.customName || "",
    width: itemSaved.width ?? bulk.width ?? null,
    height: itemSaved.height ?? bulk.height ?? null,
    bulkPrefix: bulk.customNamePrefix || ""
  };
}

async function processItem(item, settings) {
  if (item.typeCategory === "image") {
    return await processImageFile(item.file, settings, settings.bulkPrefix);
  } else {
    return await processPdfFile(item.file, settings, settings.bulkPrefix);
  }
}

async function processImageFile(file, settings, bulkPrefix = "") {
  const { outputFormat, targetBytes, width, height, customName } = settings;
  const img = await loadImageFromFile(file);
  const finalDimensions = calculateOutputDimensions(img.width, img.height, width, height);

  let finalNameBase = customName || "";
  if (!finalNameBase && bulkPrefix) finalNameBase = `${bulkPrefix}-${stripExt(file.name)}`;

  if (outputFormat === "pdf") {
    const blob = await imageToPdfBlob(img, finalDimensions.width, finalDimensions.height, targetBytes);
    const fileName = buildOutputName(finalNameBase, file.name, "pdf");
    return {
      blob,
      fileName,
      previewType: "pdf",
      formatLabel: "PDF",
      dimensionsText: `${finalDimensions.width} × ${finalDimensions.heigh
