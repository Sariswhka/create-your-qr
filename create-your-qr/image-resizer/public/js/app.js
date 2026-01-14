// Image Resizer App Logic
let originalImage = null;
let originalWidth = 0;
let originalHeight = 0;
let originalFileSize = 0;
let aspectRatioLocked = true;
let aspectRatio = 1;
let cropper = null;
let currentQuality = 80;
let currentFormat = 'jpeg';

// DOM Elements
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const uploadSection = document.getElementById('uploadSection');
const editorSection = document.getElementById('editorSection');
const previewImage = document.getElementById('previewImage');
const cropImage = document.getElementById('cropImage');
const resetBtn = document.getElementById('resetBtn');
const downloadBtn = document.getElementById('downloadBtn');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const lockRatio = document.getElementById('lockRatio');
const customPercent = document.getElementById('customPercent');
const qualitySlider = document.getElementById('qualitySlider');
const qualityValue = document.getElementById('qualityValue');

// Initialize
lockRatio.classList.add('locked');

// File Upload Handlers
uploadArea.addEventListener('click', () => fileInput.click());

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        loadImage(file);
    }
});

// Max file size: 20MB
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Load Image
function loadImage(file) {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        showFileSizeError(file.size);
        return;
    }

    originalFileSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            originalImage = img;
            originalWidth = img.width;
            originalHeight = img.height;
            aspectRatio = originalWidth / originalHeight;

            // Update preview
            previewImage.src = e.target.result;
            cropImage.src = e.target.result;

            // Update info
            document.getElementById('originalSize').textContent = `Original: ${originalWidth} x ${originalHeight}`;
            document.getElementById('fileSize').textContent = `Size: ${formatFileSize(originalFileSize)}`;

            // Set initial dimensions
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;
            updateNewDimensions();

            // Show editor
            uploadSection.classList.add('hidden');
            editorSection.classList.remove('hidden');

            // Initialize cropper when crop tab is opened
            initCropper();
        };
        img.src = e.target.result;
    };

    reader.readAsDataURL(file);
}

// Reset to upload
resetBtn.addEventListener('click', () => {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    editorSection.classList.add('hidden');
    uploadSection.classList.remove('hidden');
    fileInput.value = '';
});

// Tabs
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Tab').classList.add('active');

        // Reinitialize cropper when crop tab is shown
        if (tab.dataset.tab === 'crop' && originalImage) {
            setTimeout(() => initCropper(), 100);
        }
    });
});

// Resize Methods
document.querySelectorAll('.method-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (btn.dataset.method === 'dimensions') {
            document.getElementById('dimensionsGroup').classList.remove('hidden');
            document.getElementById('percentageGroup').classList.add('hidden');
        } else {
            document.getElementById('dimensionsGroup').classList.add('hidden');
            document.getElementById('percentageGroup').classList.remove('hidden');
            applyPercentage(parseInt(customPercent.value));
        }
    });
});

// Dimension Inputs
widthInput.addEventListener('input', () => {
    if (aspectRatioLocked && originalImage) {
        const newWidth = parseInt(widthInput.value) || 0;
        heightInput.value = Math.round(newWidth / aspectRatio);
    }
    updateNewDimensions();
});

heightInput.addEventListener('input', () => {
    if (aspectRatioLocked && originalImage) {
        const newHeight = parseInt(heightInput.value) || 0;
        widthInput.value = Math.round(newHeight * aspectRatio);
    }
    updateNewDimensions();
});

// Lock Ratio Toggle
lockRatio.addEventListener('click', () => {
    aspectRatioLocked = !aspectRatioLocked;
    lockRatio.classList.toggle('locked', aspectRatioLocked);
});

// Percentage Buttons
document.querySelectorAll('.percent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.percent-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        customPercent.value = btn.dataset.percent;
        applyPercentage(parseInt(btn.dataset.percent));
    });
});

customPercent.addEventListener('input', () => {
    document.querySelectorAll('.percent-btn').forEach(b => b.classList.remove('active'));
    applyPercentage(parseInt(customPercent.value) || 100);
});

function applyPercentage(percent) {
    if (originalImage) {
        widthInput.value = Math.round(originalWidth * percent / 100);
        heightInput.value = Math.round(originalHeight * percent / 100);
        updateNewDimensions();
    }
}

function updateNewDimensions() {
    const w = parseInt(widthInput.value) || 0;
    const h = parseInt(heightInput.value) || 0;
    document.getElementById('newSize').textContent = `${w} x ${h}`;
    updateEstimatedSize();
}

// Cropper
function initCropper() {
    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(cropImage, {
        viewMode: 1,
        dragMode: 'crop',
        aspectRatio: NaN,
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
    });
}

// Aspect Ratio Buttons
document.querySelectorAll('.aspect-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (cropper) {
            const aspect = btn.dataset.aspect === 'free' ? NaN : parseFloat(btn.dataset.aspect);
            cropper.setAspectRatio(aspect);
        }
    });
});

// Apply Crop
document.getElementById('applyCrop').addEventListener('click', () => {
    if (cropper) {
        const canvas = cropper.getCroppedCanvas();
        if (canvas) {
            originalImage = new Image();
            originalImage.src = canvas.toDataURL();
            originalWidth = canvas.width;
            originalHeight = canvas.height;
            aspectRatio = originalWidth / originalHeight;

            previewImage.src = originalImage.src;
            widthInput.value = originalWidth;
            heightInput.value = originalHeight;

            document.getElementById('originalSize').textContent = `Cropped: ${originalWidth} x ${originalHeight}`;
            updateNewDimensions();

            // Switch to resize tab
            document.querySelector('.tab[data-tab="resize"]').click();
        }
    }
});

// Quality Slider
qualitySlider.addEventListener('input', () => {
    currentQuality = parseInt(qualitySlider.value);
    qualityValue.textContent = currentQuality;
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    updateEstimatedSize();
});

// Quality Presets
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentQuality = parseInt(btn.dataset.quality);
        qualitySlider.value = currentQuality;
        qualityValue.textContent = currentQuality;
        updateEstimatedSize();
    });
});

// Format Buttons
document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFormat = btn.dataset.format;
        updateEstimatedSize();
    });
});

function updateEstimatedSize() {
    if (!originalImage) return;

    const w = parseInt(widthInput.value) || originalWidth;
    const h = parseInt(heightInput.value) || originalHeight;

    // Rough estimation based on dimensions and quality
    const pixels = w * h;
    const originalPixels = originalWidth * originalHeight;
    const sizeRatio = pixels / originalPixels;
    const qualityRatio = currentQuality / 100;

    let estimatedBytes = originalFileSize * sizeRatio * qualityRatio;

    // PNG is usually larger
    if (currentFormat === 'png') {
        estimatedBytes *= 1.5;
    } else if (currentFormat === 'webp') {
        estimatedBytes *= 0.7;
    }

    document.getElementById('estimatedSize').textContent = formatFileSize(estimatedBytes);
}

// Download
downloadBtn.addEventListener('click', () => {
    if (!originalImage) return;

    const width = parseInt(widthInput.value) || originalWidth;
    const height = parseInt(heightInput.value) || originalHeight;

    // Create canvas and resize
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Draw image
    ctx.drawImage(originalImage, 0, 0, width, height);

    // Get mime type
    let mimeType = 'image/jpeg';
    let extension = 'jpg';
    if (currentFormat === 'png') {
        mimeType = 'image/png';
        extension = 'png';
    } else if (currentFormat === 'webp') {
        mimeType = 'image/webp';
        extension = 'webp';
    }

    // Convert to blob and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `resized-image.${extension}`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
    }, mimeType, currentQuality / 100);
});

// Utility Functions
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// File Size Error
function showFileSizeError(fileSize) {
    const errorHTML = `
        <div class="file-error-overlay" id="fileErrorOverlay">
            <div class="file-error-modal">
                <div class="error-icon">
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                </div>
                <h3>File Too Large</h3>
                <p>Your image is <strong>${formatFileSize(fileSize)}</strong></p>
                <p>Maximum allowed size is <strong>20 MB</strong></p>
                <div class="error-tips">
                    <p>Tips to reduce file size:</p>
                    <ul>
                        <li>Use a smaller resolution image</li>
                        <li>Convert to JPG format</li>
                        <li>Compress the image first</li>
                    </ul>
                </div>
                <button class="btn btn-primary" onclick="closeFileSizeError()">Try Another Image</button>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', errorHTML);
}

function closeFileSizeError() {
    const overlay = document.getElementById('fileErrorOverlay');
    if (overlay) {
        overlay.remove();
    }
    fileInput.value = '';
}

// Background Removal
const removeBgBtn = document.getElementById('removeBgBtn');
const bgProgress = document.getElementById('bgProgress');
const bgResult = document.getElementById('bgResult');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

let removeBackground = null;

removeBgBtn.addEventListener('click', async () => {
    if (!originalImage) {
        alert('Please upload an image first');
        return;
    }

    // Show progress, hide result
    bgProgress.classList.remove('hidden');
    bgResult.classList.add('hidden');
    removeBgBtn.disabled = true;
    removeBgBtn.textContent = 'Processing...';
    progressFill.style.width = '5%';
    progressText.textContent = 'Loading AI library...';

    try {
        // Load library dynamically if not loaded
        if (!removeBackground) {
            const module = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.1/+esm');
            removeBackground = module.removeBackground;
        }

        progressFill.style.width = '15%';
        progressText.textContent = 'Preparing image...';

        // Convert image to blob
        const canvas = document.createElement('canvas');
        canvas.width = originalWidth;
        canvas.height = originalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(originalImage, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

        progressFill.style.width = '20%';
        progressText.textContent = 'Downloading AI model (~5MB)... Please wait.';

        // Remove background using the library
        const config = {
            progress: (key, current, total) => {
                if (key.includes('fetch')) {
                    const percent = 20 + Math.round((current / total) * 40);
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Downloading model... ${Math.round((current / total) * 100)}%`;
                } else if (key.includes('inference')) {
                    const percent = 60 + Math.round((current / total) * 35);
                    progressFill.style.width = `${percent}%`;
                    progressText.textContent = `Processing image... ${Math.round((current / total) * 100)}%`;
                }
            }
        };

        const result = await removeBackground(blob, config);

        progressFill.style.width = '95%';
        progressText.textContent = 'Finalizing...';

        // Create new image from result
        const resultUrl = URL.createObjectURL(result);
        const newImg = new Image();
        newImg.onload = () => {
            originalImage = newImg;
            previewImage.src = resultUrl;
            cropImage.src = resultUrl;

            // Update info
            document.getElementById('originalSize').textContent = `BG Removed: ${originalWidth} x ${originalHeight}`;

            // Auto-select PNG format for transparency
            document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('.format-btn[data-format="png"]').classList.add('active');
            currentFormat = 'png';

            progressFill.style.width = '100%';
            bgProgress.classList.add('hidden');
            bgResult.classList.remove('hidden');

            // Reinitialize cropper if needed
            if (cropper) {
                cropper.destroy();
                initCropper();
            }
        };
        newImg.src = resultUrl;

    } catch (error) {
        console.error('Background removal error:', error);
        bgProgress.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = 'Error: ' + (error.message || 'Could not remove background. Try a smaller image.');
    } finally {
        removeBgBtn.disabled = false;
        removeBgBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 14l2 2 4-4"/>
            </svg>
            Remove Background
        `;
    }
});
