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
const downloadBtn = document.getElementById("downloadBtn");
const modalTitle = document.getElementById("modalTitle");
const modalSub = document.getElementById("modalSub");
const modalPreview = document.getElementById("modalPreview");
const targetSizeInput = document.getElementById("targetSize");
const sizeUnitSelect = document.getElementById("sizeUnit");
const outputFormatSelect = document.getElementById("outputFormat");
const outputNameInput = document.getElementById("outputName");
const originalInfo = document.getElementById("originalInfo");
const modeInfo = document.getElementById("modeInfo");

let uploadedFiles = [];
let activeFileId = null;

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
  uploadedFiles = [];
  renderFiles();
});

closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

downloadBtn.addEventListener("click", async () => {
  const item = uploadedFiles.find((f) => f.id === activeFileId);
  if (!item) return;

  try {
    downloadBtn.disabled = true;
    downloadBtn.textContent = "Processing...";

    const customName = outputNameInput.value.trim();
    const targetValue = parseFloat(targetSizeInput.value);
    const targetBytes = !isNaN(targetValue)
      ? convertToBytes(targetValue, sizeUnitSelect.value)
      : null;
    const outputFormat = outputFormatSelect.value;

    if (item.typeCategory === "image") {
      const resultBlob = await processImageToTarget(item.file, outputFormat, targetBytes);
      const finalName = buildOutputName(customName, item.file.name, outputFormat);
      triggerDownload(resultBlob, finalName);
    } else if (item.typeCategory === "pdf") {
      const resultBlob = await processPdf(item.file, targetBytes);
      const finalName = buildOutputName(customName, item.file.name, "pdf");
      triggerDownload(resultBlob, finalName);
    }

    closeModal();
  } catch (err) {
    console.error(err);
    alert("Processing failed. Try a smaller file or different settings.");
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
      const pdfWrap = document.createElement("div");
      pdfWrap.className = "pdf-icon-box";
      pdfWrap.innerHTML = `
        <div class="pdf-icon">📄</div>
        <div>PDF File</div>
      `;
      previewBox.appendChild(pdfWrap);

      renderPdfThumbnail(item.file, previewBox);
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

function removeFile(id) {
  const item = uploadedFiles.find((f) => f.id === id);
  if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
  uploadedFiles = uploadedFiles.filter((f) => f.id !== id);
  renderFiles();
}

function openModal(fileId) {
  activeFileId = fileId;
  const item = uploadedFiles.find((f) => f.id === fileId);
  if (!item) return;

  modalTitle.textContent = "Download Settings";
  modalSub.textContent = item.file.name;
  outputNameInput.value = "";
  targetSizeInput.value = "";
  sizeUnitSelect.value = "KB";
  originalInfo.textContent = `${item.file.name} • ${formatBytes(item.file.size)} • ${item.file.type}`;
  modeInfo.textContent =
    item.typeCategory === "image"
      ? "Image: compression + conversion + rename"
      : "PDF: rename + PDF export";

  setupOutputFormats(item);
  renderModalPreview(item);

  modalOverlay.classList.remove("hidden");
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalPreview.innerHTML = "";
  activeFileId = null;
}

function setupOutputFormats(item) {
  outputFormatSelect.innerHTML = "";

  if (item.typeCategory === "image") {
    const formats = [
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
    const holder = document.createElement("div");
    holder.className = "pdf-icon-box";
    holder.innerHTML = `
      <div class="pdf-icon">📄</div>
      <div>${item.file.name}</div>
    `;
    modalPreview.appendChild(holder);

    renderPdfThumbnail(item.file, modalPreview, true);
  }
}

async function renderPdfThumbnail(file, container, bigger = false) {
  if (!window.pdfjsLib) return;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);

    const viewport = page.getViewport({ scale: bigger ? 1.2 : 0.6 });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;
    container.innerHTML = "";
    container.appendChild(canvas);
  } catch (e) {
    console.warn("PDF preview failed", e);
  }
}

async function processImageToTarget(file, outputFormat, targetBytes) {
  const img = await loadImageFromFile(file);

  let width = img.width;
  let height = img.height;
  let quality = 0.92;

  let blob = await canvasExport(img, width, height, outputFormat, quality);

  // अगर target size नहीं दिया, तो simply original-like export
  if (!targetBytes) return blob;

  // अगर PNG चुना है, exact size control limited होता है; फिर भी कोशिश करेंगे
  // पहले quality/resize loop
  let attempts = 0;
  let bestBlob = blob;
  let bestDiff = Math.abs(blob.size - targetBytes);

  while (attempts < 18) {
    const diff = blob.size - targetBytes;

    if (Math.abs(diff) <= Math.max(15 * 1024, targetBytes * 0.08)) {
      bestBlob = blob;
      break;
    }

    if (blob.size > targetBytes) {
      if (outputFormat === "png") {
        width = Math.max(200, Math.floor(width * 0.9));
        height = Math.max(200, Math.floor(height * 0.9));
      } else {
        quality = Math.max(0.1, quality - 0.08);
        if (quality <= 0.28) {
          width = Math.max(200, Math.floor(width * 0.92));
          height = Math.max(200, Math.floor(height * 0.92));
        }
      }
    } else {
      // blob smaller than target; थोड़ा quality बढ़ाओ / size बढ़ाओ
      if (outputFormat !== "png" && quality < 0.98) {
        quality = Math.min(0.98, quality + 0.04);
      } else {
        width = Math.floor(width * 1.04);
        height = Math.floor(height * 1.04);
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

async function processPdf(file, targetBytes) {
  // Frontend-only realistic mode:
  // PDF को as image render करके फिर jsPDF में re-export करेंगे.
  // यह exact PDF optimization नहीं है, लेकिन client-side workable है.
  if (!window.pdfjsLib || !window.jspdf) {
    return file;
  }

  const { jsPDF } = window.jspdf;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;

  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });

  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);

    // target size होने पर scale कम कर सकते हैं
    const baseScale = targetBytes ? 1.1 : 1.4;
    const viewport = page.getViewport({ scale: baseScale });

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    // JPEG quality
    let quality = 0.85;
    if (targetBytes) {
      // rough optimization
      if (targetBytes < 300 * 1024) quality = 0.45;
      else if (targetBytes < 700 * 1024) quality = 0.6;
      else quality = 0.75;
    }

    const imgData = canvas.toDataURL("image/jpeg", quality);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    if (i > 1) doc.addPage();
    doc.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
  }

  const blob = doc.output("blob");
  return blob;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasExport(img, width, height, format, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = width;
    canvas.height = height;

    // PNG में transparency support, JPEG में white background
    if (format === "jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    ctx.drawImage(img, 0, 0, width, height);

    const mime = format === "jpeg"
      ? "image/jpeg"
      : format === "png"
      ? "image/png"
      : "image/webp";

    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Blob generation failed"));
        resolve(blob);
      },
      mime,
      format === "png" ? undefined : quality
    );
  });
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function buildOutputName(customName, originalName, ext) {
  const cleanExt = ext.toLowerCase();
  if (customName) {
    return customName.includes(".")
      ? customName
      : `${customName}.${cleanExt}`;
  }

  const base = originalName.replace(/\.[^/.]+$/, "");
  return `${base}-${Date.now()}.${cleanExt}`;
}

function convertToBytes(value, unit) {
  if (unit === "MB") return value * 1024 * 1024;
  return value * 1024;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
