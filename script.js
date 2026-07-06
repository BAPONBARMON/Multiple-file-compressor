const MAX_FILES = 20;
const MAX_TOTAL_SIZE = 10 * 1024 * 1024; // 10 MB

const fileInput = document.getElementById("fileInput");
const chooseBtn = document.getElementById("chooseBtn");
const dropzone = document.getElementById("dropzone");
const fileGrid = document.getElementById("fileGrid");
const emptyState = document.getElementById("emptyState");
const fileCountEl = document.getElementById("fileCount");
const totalSizeEl = document.getElementById("totalSize");
const clearAllBtn = document.getElementById("clearAllBtn");

const uploadProgressWrap = document.getElementById("uploadProgressWrap");
const uploadProgressFill = document.getElementById("uploadProgressFill");
const uploadProgressText = document.getElementById("uploadProgressText");
const uploadProgressPercent = document.getElementById("uploadProgressPercent");

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

/* =========================
   INIT
========================= */
function init() {
  if (!fileInput) {
    alert("fileInput not found in HTML.");
    console.error("fileInput missing");
    return;
  }

  fileInput.addEventListener("change", async (e) => {
    const files = e.target.files;
    await handleSelectedFiles(files);
  });

  if (chooseBtn) {
    chooseBtn.addEventListener("click", () => {
      fileInput.value = "";
    });
  }

  if (dropzone) {
    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => {
      dropzone.classList.remove("dragover");
    });

    dropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      await handleSelectedFiles(e.dataTransfer.files);
    });
  }

  if (clearAllBtn) clearAllBtn.addEventListener("click", clearAllFiles);

  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  if (modalOverlay) {
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  if (previewBtn) previewBtn.addEventListener("click", buildPreview);

  if (closePreviewOverlayBtn) {
    closePreviewOverlayBtn.addEventListener("click", closePreviewOverlay);
  }

  if (backToEditBtn) {
    backToEditBtn.addEventListener("click", () => {
      closePreviewOverlay();
      modalOverlay.classList.remove("hidden");
    });
  }

  if (previewOverlay) {
    previewOverlay.addEventListener("click", (e) => {
      if (e.target === previewOverlay) closePreviewOverlay();
    });
  }

  if (finalDownloadBtn) {
    finalDownloadBtn.addEventListener("click", () => {
      if (!lastPreviewResult || !lastPreviewResult.blob) {
        alert("Please generate preview first.");
        return;
      }
      triggerDownload(lastPreviewResult.blob, lastPreviewResult.fileName);
      closePreviewOverlay();
      closeModal();
    });
  }

  renderFiles();
}

/* =========================
   FILE TYPE HELPERS
========================= */
function getExtension(name = "") {
  const parts = name.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() : "";
}

function isImageFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const ext = getExtension(file.name);
  return type.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(ext);
}

function isPdfFile(file) {
  if (!file) return false;
  const type = (file.type || "").toLowerCase();
  const ext = getExtension(file.name);
  return type === "application/pdf" || ext === "pdf";
}

/* =========================
   UPLOAD PROGRESS UI
========================= */
function showUploadProgress() {
  if (!uploadProgressWrap) return;
  uploadProgressWrap.classList.remove("hidden");
  setUploadProgress(0, "Preparing files...");
}

function hideUploadProgress(delay = 500) {
  if (!uploadProgressWrap) return;
  setTimeout(() => {
    uploadProgressWrap.classList.add("hidden");
    if (uploadProgressFill) uploadProgressFill.style.width = "0%";
    if (uploadProgressText) uploadProgressText.textContent = "Preparing files...";
    if (uploadProgressPercent) uploadProgressPercent.textContent = "0%";
  }, delay);
}

function setUploadProgress(percent, text = "Uploading...") {
  const safe = Math.max(0, Math.min(100, Math.round(percent)));
  if (uploadProgressFill) uploadProgressFill.style.width = `${safe}%`;
  if (uploadProgressPercent) uploadProgressPercent.textContent = `${safe}%`;
  if (uploadProgressText) uploadProgressText.textContent = text;
}

/* =========================
   FILE HANDLING
========================= */
async function handleSelectedFiles(fileList) {
  if (!fileList || !fileList.length) return;

  const incoming = Array.from(fileList);
  const supported = incoming.filter(file => isImageFile(file) || isPdfFile(file));

  if (!supported.length) {
    alert("Only JPG, JPEG, PNG, WEBP and PDF files are supported.");
    fileInput.value = "";
    return;
  }

  if (supported.length !== incoming.length) {
    alert("Some unsupported files were skipped.");
  }

  if (uploadedFiles.length + supported.length > MAX_FILES) {
    alert(`You can upload a maximum of ${MAX_FILES} files.`);
    fileInput.value = "";
    return;
  }

  const currentTotal = uploadedFiles.reduce((sum, item) => sum + item.file.size, 0);
  const incomingTotal = supported.reduce((sum, file) => sum + file.size, 0);

  if (currentTotal + incomingTotal > MAX_TOTAL_SIZE) {
    alert("Total upload size cannot exceed 10 MB.");
    fileInput.value = "";
    return;
  }

  showUploadProgress();

  const newItems = [];

  for (let i = 0; i < supported.length; i++) {
    const file = supported[i];
    const typeCategory = isImageFile(file) ? "image" : "pdf";

    const item = {
      id: createId(),
      file,
      typeCategory,
      previewUrl: null,
      pdfThumbDataUrl: null
    };

    setUploadProgress(
      ((i + 0.2) / supported.length) * 100,
      `Processing ${i + 1} of ${supported.length}: ${file.name}`
    );

    if (typeCategory === "image") {
      try {
        item.previewUrl = await readFileAsDataURL(file);
      } catch (err) {
        console.error("Image preview create failed:", err);
        item.previewUrl = null;
      }
    } else {
      try {
        item.pdfThumbDataUrl = await generatePdfThumbDataUrl(file);
      } catch (err) {
        console.error("PDF thumb failed:", err);
        item.pdfThumbDataUrl = null;
      }
    }

    newItems.push(item);

    setUploadProgress(
      ((i + 1) / supported.length) * 100,
      `Loaded ${i + 1} of ${supported.length}`
    );
  }

  uploadedFiles.push(...newItems);
  fileInput.value = "";

  renderFiles();
  hideUploadProgress(700);
}

/* =========================
   FILE LIST RENDER
========================= */
function renderFiles() {
  if (!fileGrid) return;

  fileGrid.innerHTML = "";

  const total = uploadedFiles.reduce((sum, item) => sum + item.file.size, 0);

  if (fileCountEl) fileCountEl.textContent = `${uploadedFiles.length} / ${MAX_FILES}`;
  if (totalSizeEl) totalSizeEl.textContent = `${formatBytes(total)} / 10 MB`;

  if (!uploadedFiles.length) {
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

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
      if (item.previewUrl) {
        const img = document.createElement("img");
        img.src = item.previewUrl;
        img.alt = item.file.name;
        img.onerror = () => {
          previewBox.innerHTML = "";
          previewBox.appendChild(badge);
          previewBox.appendChild(createFallbackPreview("IMAGE", item.file.name));
        };
        previewBox.appendChild(img);
      } else {
        previewBox.appendChild(createFallbackPreview("IMAGE", item.file.name));
      }
    } else {
      if (item.pdfThumbDataUrl) {
        const img = document.createElement("img");
        img.src = item.pdfThumbDataUrl;
        img.alt = item.file.name;
        img.onerror = () => {
          previewBox.innerHTML = "";
          previewBox.appendChild(badge);
          previewBox.appendChild(createFallbackPreview("PDF", item.file.name));
        };
        previewBox.appendChild(img);
      } else {
        previewBox.appendChild(createFallbackPreview("PDF", item.file.name));
      }
    }

    const meta = document.createElement("div");
    meta.className = "file-meta";

    const fileName = document.createElement("div");
    fileName.className = "file-name";
    fileName.textContent = item.file.name;

    const fileSize = document.createElement("div");
    fileSize.className = "file-size";
    fileSize.textContent = `${formatBytes(item.file.size)} • ${item.file.type || getExtension(item.file.name) || "unknown"}`;

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "btn primary";
    downloadBtn.type = "button";
    downloadBtn.textContent = "Download";
    downloadBtn.addEventListener("click", () => openModal(item.id));

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn danger";
    removeBtn.type = "button";
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

/* =========================
   REMOVE / CLEAR
========================= */
function clearAllFiles() {
  uploadedFiles = [];
  renderFiles();
}

function removeFile(id) {
  uploadedFiles = uploadedFiles.filter(item => item.id !== id);
  renderFiles();
}

/* =========================
   FALLBACK PREVIEW
========================= */
function createFallbackPreview(type, fileName) {
  const wrap = document.createElement("div");
  wrap.className = "pdf-placeholder";
  wrap.innerHTML = `
    <div class="pdf-icon">${type === "PDF" ? "📄" : "🖼"}</div>
    <div>${type} File</div>
    <div class="pdf-file-label">${escapeHtml(fileName)}</div>
  `;
  return wrap;
}

/* =========================
   MODAL
========================= */
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

  originalInfo.textContent = `${item.file.name} • ${formatBytes(item.file.size)} • ${item.file.type || getExtension(item.file.name)}`;

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
  if (modalPreview) modalPreview.innerHTML = "";
  activeFileId = null;
}

function closePreviewOverlay() {
  previewOverlay.classList.add("hidden");
  if (resultPreviewVisual) resultPreviewVisual.innerHTML = "";
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
    if (item.previewUrl) {
      const img = document.createElement("img");
      img.src = item.previewUrl;
      img.alt = item.file.name;
      img.onerror = () => {
        modalPreview.innerHTML = "";
        modalPreview.appendChild(createFallbackPreview("IMAGE", item.file.name));
      };
      modalPreview.appendChild(img);
    } else {
      modalPreview.appendChild(createFallbackPreview("IMAGE", item.file.name));
    }
  } else {
    if (item.pdfThumbDataUrl) {
      const img = document.createElement("img");
      img.src = item.pdfThumbDataUrl;
      img.alt = item.file.name;
      img.onerror = () => {
        modalPreview.innerHTML = "";
        modalPreview.appendChild(createFallbackPreview("PDF", item.file.name));
      };
      modalPreview.appendChild(img);
    } else {
      modalPreview.appendChild(createFallbackPreview("PDF", item.file.name));
    }
  }
}

/* =========================
   FINAL PREVIEW + DOWNLOAD
========================= */
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
    img.onerror = () => {
      resultPreviewVisual.innerHTML = "";
      resultPreviewVisual.appendChild(createFallbackPreview("IMAGE", result.fileName));
    };
    resultPreviewVisual.appendChild(img);
  } else {
    resultPreviewVisual.appendChild(createFallbackPreview(result.formatLabel || "PDF", result.fileName));
  }
}

/* =========================
   IMAGE / PDF PROCESSING
========================= */
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

  const blob = await processImageToTarget(
    file,
    outputFormat,
    targetBytes,
    finalDimensions.width,
    finalDimensions.height
  );

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
    if (t
