class EVACameraStation {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('cameraPreview');
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.canvas = document.getElementById('photoCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isCameraActive = false;
        this.currentFilter = 'none';
        this.previewAnimationId = null;
        this.isComplexFilter = false;
        
        // Timer system
        this.workingTime = 180; // 3 minutes in seconds
        this.modalTime = 180;   // 3 minutes in seconds
        this.workingTimer = null;
        this.modalTimer = null;
        this.isExplorationPhase = true;
        this.explorationStarted = false;
        
        // DOM elements
        this.startCameraBtn = document.getElementById('startCameraBtn');
        this.captureBtn = document.getElementById('captureBtn');
        this.cameraStatus = document.getElementById('cameraStatus');
        this.filterControls = document.getElementById('filterControls');
        this.filterOverlay = document.getElementById('filterOverlay');
        this.byteCompanion = document.getElementById('byteCompanion');
        this.byteCharacter = document.getElementById('byteCharacter');
        this.timerDisplay = document.getElementById('timerDisplay');
        this.timerText = document.getElementById('timerText');
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalTimer = document.getElementById('modalTimer');
        this.stationChangeOverlay = document.getElementById('stationChangeOverlay');
        this.successMessage = document.getElementById('successMessage');
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Camera controls
        this.startCameraBtn.addEventListener('click', () => this.toggleCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        
        // Filter controls
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.applyFilter(e.target.dataset.filter));
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5') {
                e.preventDefault();
                location.reload();
            }
            if (e.code === 'Space' && this.isCameraActive) {
                e.preventDefault();
                this.capturePhoto();
            }
        });
    }

    async toggleCamera() {
        if (!this.isCameraActive) {
            await this.startCamera();
        } else {
            this.stopCamera();
        }
    }

    async startCamera() {
        try {
            // Request camera access
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = this.stream;
            this.isCameraActive = true;
            
            // Update UI
            this.updateCameraUI();
            this.updateCameraStatus('Kamera aktiv');
            
            // Show filter controls
            this.filterControls.style.display = 'flex';
            
            // Start exploration timer on first camera start
            if (!this.explorationStarted) {
                this.startExplorationTimer();
                this.explorationStarted = true;
            }

        } catch (error) {
            console.error('Camera access error:', error);
            this.handleCameraError(error);
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        this.video.srcObject = null;
        this.isCameraActive = false;
        
        // Stop preview processing
        this.stopPreviewProcessing();
        
        // Reset display
        this.video.style.display = 'block';
        this.previewCanvas.style.display = 'none';
        
        // Update UI
        this.updateCameraUI();
        this.updateCameraStatus('Bereit');
        this.filterControls.style.display = 'none';
    }

    updateCameraUI() {
        if (this.isCameraActive) {
            this.startCameraBtn.textContent = 'Kamera stoppen';
            this.startCameraBtn.style.background = 'linear-gradient(45deg, #e76f51, #d45c3e)';
            this.captureBtn.style.display = 'inline-block';
        } else {
            this.startCameraBtn.textContent = 'Kamera starten';
            this.startCameraBtn.style.background = 'linear-gradient(45deg, #d4943a, #b8802e)';
            this.captureBtn.style.display = 'none';
        }
    }

    updateCameraStatus(status) {
        this.cameraStatus.textContent = status;
    }

    applyFilter(filterType) {
        this.currentFilter = filterType;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-filter="${filterType}"]`).classList.add('active');
        
        // Check if this is a complex filter that needs canvas processing
        const complexFilters = ['pixelate', 'fisheye', 'mirror', 'ascii', 'popart'];
        this.isComplexFilter = complexFilters.includes(filterType);
        
        if (this.isComplexFilter) {
            // Show canvas for complex filters
            this.video.style.display = 'none';
            this.previewCanvas.style.display = 'block';
            this.startPreviewProcessing();
        } else {
            // Use CSS filters for simple filters
            this.video.style.display = 'block';
            this.previewCanvas.style.display = 'none';
            this.stopPreviewProcessing();
            this.video.className = `filter-${filterType}`;
            this.filterOverlay.className = `filter-overlay filter-${filterType}`;
        }
    }

    async capturePhoto() {
        if (!this.isCameraActive) return;
        
        try {
            // Set canvas size to match video
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            // Draw video frame to canvas
            this.ctx.drawImage(this.video, 0, 0);
            
            // Apply filter to canvas if needed
            this.applyCanvasFilter();
            
            // Show capture animation
            this.showCaptureAnimation();
            
            // Show success message
            this.showSuccessMessage();
            
            // Update Byte to happy state
            this.setByte('happy');
            
            // Try to print the photo
            await this.printPhoto();
            
            // Update status
            this.updateCameraStatus('Foto aufgenommen!');
            
            setTimeout(() => {
                this.setByte('normal');
                this.updateCameraStatus('Kamera aktiv');
            }, 2000);

        } catch (error) {
            console.error('Photo capture error:', error);
            this.updateCameraStatus('Fehler beim Aufnehmen');
        }
    }

    applyCanvasFilter() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        
        switch (this.currentFilter) {
            case 'sepia':
                this.applySepiaFilter(data);
                break;
            case 'grayscale':
                this.applyGrayscaleFilter(data);
                break;
            case 'brightness':
                this.applyBrightnessFilter(data);
                break;
            case 'vintage':
                this.applyVintageFilter(data);
                break;
            case 'pixelate':
                this.applyPixelateFilter();
                return; // Special handling
            case 'fisheye':
                this.applyFisheyeFilter();
                return; // Special handling
            case 'mirror':
                this.applyMirrorFilter();
                return; // Special handling
            case 'rainbow':
                this.applyRainbowFilter(data);
                break;
            case 'negative':
                this.applyNegativeFilter(data);
                break;
            case 'ascii':
                this.applyASCIIFilter();
                return; // Special handling
            case 'sketch':
                this.applySketchFilter(data);
                break;
            case 'popart':
                this.applyPopArtFilter();
                return; // Special handling
            // blur filter is handled by CSS during capture
        }
        
        this.ctx.putImageData(imageData, 0, 0);
    }

    applySepiaFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
        }
    }

    applyGrayscaleFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
    }

    applyBrightnessFilter(data) {
        const brightness = 30;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] + brightness);
            data[i + 1] = Math.min(255, data[i + 1] + brightness);
            data[i + 2] = Math.min(255, data[i + 2] + brightness);
        }
    }

    applyVintageFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Sepia effect
            data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189));
            data[i + 1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168));
            data[i + 2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
            
            // Add slight warmth
            data[i] = Math.min(255, data[i] + 10);
            data[i + 1] = Math.min(255, data[i + 1] + 5);
        }
    }

    applyPixelateFilter() {
        const pixelSize = 8;
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const imageData = this.ctx.getImageData(x, y, pixelSize, pixelSize);
                const data = imageData.data;
                
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }
                
                if (count > 0) {
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);
                    
                    this.ctx.fillStyle = `rgb(${r},${g},${b})`;
                    this.ctx.fillRect(x, y, pixelSize, pixelSize);
                }
            }
        }
    }

    applyFisheyeFilter() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY);
        
        const newImageData = this.ctx.createImageData(width, height);
        const newData = newImageData.data;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius) {
                    const factor = distance / radius;
                    const fisheyeFactor = factor * factor;
                    
                    const sourceX = Math.floor(centerX + dx * fisheyeFactor);
                    const sourceY = Math.floor(centerY + dy * fisheyeFactor);
                    
                    if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                        const targetIndex = (y * width + x) * 4;
                        const sourceIndex = (sourceY * width + sourceX) * 4;
                        
                        newData[targetIndex] = data[sourceIndex];
                        newData[targetIndex + 1] = data[sourceIndex + 1];
                        newData[targetIndex + 2] = data[sourceIndex + 2];
                        newData[targetIndex + 3] = data[sourceIndex + 3];
                    }
                }
            }
        }
        
        this.ctx.putImageData(newImageData, 0, 0);
    }

    applyMirrorFilter() {
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.canvas, -this.canvas.width, 0);
        this.ctx.scale(-1, 1); // Reset scale
    }

    applyRainbowFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Convert to HSL and shift hue
            const hsl = this.rgbToHsl(r, g, b);
            hsl[0] = (hsl[0] + 0.3) % 1; // Shift hue
            hsl[1] = Math.min(1, hsl[1] * 2); // Increase saturation
            
            const rgb = this.hslToRgb(hsl[0], hsl[1], hsl[2]);
            data[i] = rgb[0];
            data[i + 1] = rgb[1];
            data[i + 2] = rgb[2];
        }
    }

    applyNegativeFilter(data) {
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];       // Red
            data[i + 1] = 255 - data[i + 1]; // Green
            data[i + 2] = 255 - data[i + 2]; // Blue
        }
    }

    applySketchFilter(data) {
        // First apply grayscale
        for (let i = 0; i < data.length; i += 4) {
            const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
        }
        
        // Apply edge detection
        const width = this.canvas.width;
        const height = this.canvas.height;
        const newData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                const gx = -data[((y-1) * width + (x-1)) * 4] + data[((y-1) * width + (x+1)) * 4] +
                          -2 * data[(y * width + (x-1)) * 4] + 2 * data[(y * width + (x+1)) * 4] +
                          -data[((y+1) * width + (x-1)) * 4] + data[((y+1) * width + (x+1)) * 4];
                
                const gy = -data[((y-1) * width + (x-1)) * 4] - 2 * data[((y-1) * width + x) * 4] - data[((y-1) * width + (x+1)) * 4] +
                           data[((y+1) * width + (x-1)) * 4] + 2 * data[((y+1) * width + x) * 4] + data[((y+1) * width + (x+1)) * 4];
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                const edge = 255 - Math.min(255, magnitude);
                
                newData[idx] = edge;
                newData[idx + 1] = edge;
                newData[idx + 2] = edge;
            }
        }
        
        for (let i = 0; i < data.length; i++) {
            data[i] = newData[i];
        }
    }

    applyASCIIFilter() {
        const chars = '@%#*+=-:. ';
        const width = this.canvas.width;
        const height = this.canvas.height;
        const blockSize = 8;
        
        // Create a temporary canvas for text
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Set background
        tempCtx.fillStyle = '#000000';
        tempCtx.fillRect(0, 0, width, height);
        
        // Set text properties
        tempCtx.fillStyle = '#ffffff';
        tempCtx.font = `${blockSize}px monospace`;
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        
        const imageData = this.ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                let totalBrightness = 0;
                let pixelCount = 0;
                
                // Calculate average brightness for this block
                for (let dy = 0; dy < blockSize && y + dy < height; dy++) {
                    for (let dx = 0; dx < blockSize && x + dx < width; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        totalBrightness += brightness;
                        pixelCount++;
                    }
                }
                
                const avgBrightness = totalBrightness / pixelCount;
                const charIndex = Math.floor((avgBrightness / 255) * (chars.length - 1));
                const char = chars[charIndex];
                
                tempCtx.fillText(char, x + blockSize / 2, y + blockSize / 2);
            }
        }
        
        // Copy the ASCII result back to main canvas
        this.ctx.clearRect(0, 0, width, height);
        this.ctx.drawImage(tempCanvas, 0, 0);
    }

    applyPopArtFilter() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const quadWidth = width / 2;
        const quadHeight = height / 2;
        
        // Get original image data
        const originalImageData = this.ctx.getImageData(0, 0, width, height);
        
        // Create 4 versions with different color effects
        const effects = [
            (r, g, b) => [Math.min(255, r * 1.5), g * 0.5, b * 0.5], // Red boost
            (r, g, b) => [r * 0.5, Math.min(255, g * 1.5), b * 0.5], // Green boost
            (r, g, b) => [r * 0.5, g * 0.5, Math.min(255, b * 1.5)], // Blue boost
            (r, g, b) => [255 - r, 255 - g, 255 - b] // Negative
        ];
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Draw 4 quadrants with different effects
        for (let i = 0; i < 4; i++) {
            const x = (i % 2) * quadWidth;
            const y = Math.floor(i / 2) * quadHeight;
            
            // Create modified image data for this quadrant
            const quadImageData = this.ctx.createImageData(quadWidth, quadHeight);
            const quadData = quadImageData.data;
            
            for (let py = 0; py < quadHeight; py++) {
                for (let px = 0; px < quadWidth; px++) {
                    const sourceIdx = ((py * 2) * width + (px * 2)) * 4; // Scale down by 2
                    const targetIdx = (py * quadWidth + px) * 4;
                    
                    if (sourceIdx < originalImageData.data.length) {
                        const r = originalImageData.data[sourceIdx];
                        const g = originalImageData.data[sourceIdx + 1];
                        const b = originalImageData.data[sourceIdx + 2];
                        const a = originalImageData.data[sourceIdx + 3];
                        
                        const [newR, newG, newB] = effects[i](r, g, b);
                        
                        quadData[targetIdx] = newR;
                        quadData[targetIdx + 1] = newG;
                        quadData[targetIdx + 2] = newB;
                        quadData[targetIdx + 3] = a;
                    }
                }
            }
            
            this.ctx.putImageData(quadImageData, x, y);
        }
    }

    // Helper functions for color conversion
    rgbToHsl(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        
        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        
        return [h, s, l];
    }

    hslToRgb(h, s, l) {
        let r, g, b;
        
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    startPreviewProcessing() {
        if (!this.isCameraActive) return;
        
        // Set canvas size to match video
        const rect = this.video.getBoundingClientRect();
        this.previewCanvas.width = this.video.videoWidth || 640;
        this.previewCanvas.height = this.video.videoHeight || 480;
        
        const processFrame = () => {
            if (!this.isCameraActive || !this.isComplexFilter) return;
            
            // Draw current video frame to canvas
            this.previewCtx.drawImage(this.video, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
            
            // Apply the current filter
            this.applyPreviewFilter();
            
            // Continue processing
            this.previewAnimationId = requestAnimationFrame(processFrame);
        };
        
        processFrame();
    }

    stopPreviewProcessing() {
        if (this.previewAnimationId) {
            cancelAnimationFrame(this.previewAnimationId);
            this.previewAnimationId = null;
        }
    }

    applyPreviewFilter() {
        switch (this.currentFilter) {
            case 'pixelate':
                this.applyPixelateFilterToCanvas(this.previewCtx, this.previewCanvas);
                break;
            case 'fisheye':
                this.applyFisheyeFilterToCanvas(this.previewCtx, this.previewCanvas);
                break;
            case 'mirror':
                this.applyMirrorFilterToCanvas(this.previewCtx, this.previewCanvas);
                break;
            case 'ascii':
                this.applyASCIIFilterToCanvas(this.previewCtx, this.previewCanvas);
                break;
            case 'popart':
                this.applyPopArtFilterToCanvas(this.previewCtx, this.previewCanvas);
                break;
        }
    }

    applyPixelateFilterToCanvas(ctx, canvas) {
        const pixelSize = 12; // Slightly larger for preview performance
        const width = canvas.width;
        const height = canvas.height;
        
        for (let y = 0; y < height; y += pixelSize) {
            for (let x = 0; x < width; x += pixelSize) {
                const imageData = ctx.getImageData(x, y, Math.min(pixelSize, width - x), Math.min(pixelSize, height - y));
                const data = imageData.data;
                
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 4) {
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }
                
                if (count > 0) {
                    r = Math.floor(r / count);
                    g = Math.floor(g / count);
                    b = Math.floor(b / count);
                    
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x, y, Math.min(pixelSize, width - x), Math.min(pixelSize, height - y));
                }
            }
        }
    }

    applyFisheyeFilterToCanvas(ctx, canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY);
        
        const newImageData = ctx.createImageData(width, height);
        const newData = newImageData.data;
        
        for (let y = 0; y < height; y += 2) { // Skip every other pixel for performance
            for (let x = 0; x < width; x += 2) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < radius) {
                    const factor = distance / radius;
                    const fisheyeFactor = factor * factor;
                    
                    const sourceX = Math.floor(centerX + dx * fisheyeFactor);
                    const sourceY = Math.floor(centerY + dy * fisheyeFactor);
                    
                    if (sourceX >= 0 && sourceX < width && sourceY >= 0 && sourceY < height) {
                        const targetIndex = (y * width + x) * 4;
                        const sourceIndex = (sourceY * width + sourceX) * 4;
                        
                        newData[targetIndex] = data[sourceIndex];
                        newData[targetIndex + 1] = data[sourceIndex + 1];
                        newData[targetIndex + 2] = data[sourceIndex + 2];
                        newData[targetIndex + 3] = data[sourceIndex + 3];
                    }
                }
            }
        }
        
        ctx.putImageData(newImageData, 0, 0);
    }

    applyMirrorFilterToCanvas(ctx, canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.scale(-1, 1);
        ctx.putImageData(imageData, -canvas.width, 0);
        ctx.scale(-1, 1); // Reset scale
    }

    applyASCIIFilterToCanvas(ctx, canvas) {
        const chars = '@%#*+=-:. ';
        const width = canvas.width;
        const height = canvas.height;
        const blockSize = 16; // Larger blocks for preview performance
        
        // Set background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // Set text properties
        ctx.fillStyle = '#ffffff';
        ctx.font = `${blockSize}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        for (let y = 0; y < height; y += blockSize) {
            for (let x = 0; x < width; x += blockSize) {
                let totalBrightness = 0;
                let pixelCount = 0;
                
                // Calculate average brightness for this block
                for (let dy = 0; dy < blockSize && y + dy < height; dy += 2) { // Skip pixels for performance
                    for (let dx = 0; dx < blockSize && x + dx < width; dx += 2) {
                        const idx = ((y + dy) * width + (x + dx)) * 4;
                        const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
                        totalBrightness += brightness;
                        pixelCount++;
                    }
                }
                
                if (pixelCount > 0) {
                    const avgBrightness = totalBrightness / pixelCount;
                    const charIndex = Math.floor((avgBrightness / 255) * (chars.length - 1));
                    const char = chars[charIndex];
                    
                    ctx.fillText(char, x + blockSize / 2, y + blockSize / 2);
                }
            }
        }
    }

    applyPopArtFilterToCanvas(ctx, canvas) {
        const width = canvas.width;
        const height = canvas.height;
        const quadWidth = width / 2;
        const quadHeight = height / 2;
        
        // Get original image data
        const originalImageData = ctx.getImageData(0, 0, width, height);
        
        // Create 4 versions with different color effects
        const effects = [
            (r, g, b) => [Math.min(255, r * 1.5), g * 0.5, b * 0.5], // Red boost
            (r, g, b) => [r * 0.5, Math.min(255, g * 1.5), b * 0.5], // Green boost
            (r, g, b) => [r * 0.5, g * 0.5, Math.min(255, b * 1.5)], // Blue boost
            (r, g, b) => [255 - r, 255 - g, 255 - b] // Negative
        ];
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw 4 quadrants with different effects
        for (let i = 0; i < 4; i++) {
            const x = (i % 2) * quadWidth;
            const y = Math.floor(i / 2) * quadHeight;
            
            // Create modified image data for this quadrant
            const quadImageData = ctx.createImageData(quadWidth, quadHeight);
            const quadData = quadImageData.data;
            
            for (let py = 0; py < quadHeight; py += 2) { // Skip pixels for performance
                for (let px = 0; px < quadWidth; px += 2) {
                    const sourceIdx = ((py * 2) * width + (px * 2)) * 4;
                    const targetIdx = (py * quadWidth + px) * 4;
                    
                    if (sourceIdx < originalImageData.data.length) {
                        const r = originalImageData.data[sourceIdx];
                        const g = originalImageData.data[sourceIdx + 1];
                        const b = originalImageData.data[sourceIdx + 2];
                        const a = originalImageData.data[sourceIdx + 3];
                        
                        const [newR, newG, newB] = effects[i](r, g, b);
                        
                        quadData[targetIdx] = newR;
                        quadData[targetIdx + 1] = newG;
                        quadData[targetIdx + 2] = newB;
                        quadData[targetIdx + 3] = a;
                    }
                }
            }
            
            ctx.putImageData(quadImageData, x, y);
        }
    }

    showCaptureAnimation() {
        this.video.classList.add('capturing');
        setTimeout(() => {
            this.video.classList.remove('capturing');
        }, 300);
    }

    showSuccessMessage() {
        this.successMessage.classList.add('show');
        setTimeout(() => {
            this.successMessage.classList.remove('show');
        }, 2000);
    }

    setByte(state) {
        const imagePath = `Byte_mascot/Byte_${state === 'happy' ? 'Happy' : 'normal'}.png`;
        this.byteCharacter.src = imagePath;
        
        if (state === 'happy') {
            this.byteCompanion.classList.add('happy');
            setTimeout(() => {
                this.byteCompanion.classList.remove('happy');
            }, 2000);
        }
    }

    async printPhoto() {
        try {
            // Create a framed version of the photo
            const framedCanvas = this.createFramedPhoto();
            
            // Convert framed canvas to blob
            const blob = await new Promise(resolve => {
                framedCanvas.toBlob(resolve, 'image/png');
            });
            
            // Create object URL
            const url = URL.createObjectURL(blob);
            
            // Create temporary image for printing
            const printImg = new Image();
            printImg.onload = () => {
                // Create print window
                const printWindow = window.open('', '_blank');
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>EVA Kamera - Foto</title>
                            <style>
                                body { 
                                    margin: 0; 
                                    display: flex; 
                                    justify-content: center; 
                                    align-items: center; 
                                    min-height: 100vh; 
                                    background: #f5f5f5;
                                }
                                .photo-container {
                                    text-align: center;
                                    padding: 20px;
                                }
                                img { 
                                    max-width: 90%; 
                                    max-height: 80vh; 
                                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                                }
                                @media print {
                                    @page {
                                        size: A4;
                                        margin: 0.5in;
                                    }
                                    body { 
                                        margin: 0; 
                                        background: white;
                                        width: 100%;
                                        height: 100vh;
                                    }
                                    .photo-container { 
                                        padding: 0;
                                        width: 100%;
                                        height: 100%;
                                        display: flex;
                                        justify-content: center;
                                        align-items: center;
                                    }
                                    img { 
                                        max-width: 100%; 
                                        max-height: 100%; 
                                        width: auto;
                                        height: auto;
                                        object-fit: contain;
                                    }
                                }
                            </style>
                        </head>
                        <body>
                            <div class="photo-container">
                                <img src="${url}" alt="EVA Prinzip Foto" />
                            </div>
                        </body>
                    </html>
                `);
                
                printWindow.document.close();
                
                // Wait for image to load in print window, then print
                setTimeout(() => {
                    printWindow.print();
                    // Clean up after printing
                    setTimeout(() => {
                        printWindow.close();
                        URL.revokeObjectURL(url);
                    }, 1000);
                }, 500);
            };
            
            printImg.src = url;
            
        } catch (error) {
            console.error('Print error:', error);
            this.updateCameraStatus('Drucken nicht möglich');
        }
    }

    createFramedPhoto() {
        const frameWidth = 60;
        const textHeight = 40;
        const originalWidth = this.canvas.width;
        const originalHeight = this.canvas.height;
        
        // Create new canvas with frame
        const framedCanvas = document.createElement('canvas');
        framedCanvas.width = originalWidth + (frameWidth * 2);
        framedCanvas.height = originalHeight + (frameWidth * 2) + textHeight;
        
        const framedCtx = framedCanvas.getContext('2d');
        
        // Draw frame background
        framedCtx.fillStyle = '#2d2520';
        framedCtx.fillRect(0, 0, framedCanvas.width, framedCanvas.height);
        
        // Draw inner frame
        framedCtx.fillStyle = '#d4943a';
        framedCtx.fillRect(frameWidth - 5, frameWidth - 5, originalWidth + 10, originalHeight + 10);
        
        // Draw photo
        framedCtx.drawImage(this.canvas, frameWidth, frameWidth);
        
        // Draw text background
        const textY = frameWidth + originalHeight + 10;
        framedCtx.fillStyle = '#2d2520';
        framedCtx.fillRect(0, textY, framedCanvas.width, textHeight);
        
        // Draw EVA text
        framedCtx.fillStyle = '#f4a261';
        framedCtx.font = 'bold 16px Arial, sans-serif';
        framedCtx.textAlign = 'center';
        framedCtx.textBaseline = 'middle';
        
        const text = 'Aufgenommen nach dem EVA-Prinzip: Eingabe, Verarbeitung, Ausgabe';
        framedCtx.fillText(text, framedCanvas.width / 2, textY + (textHeight / 2));
        
        return framedCanvas;
    }

    handleCameraError(error) {
        let message = 'Kamera-Fehler';
        
        if (error.name === 'NotAllowedError') {
            message = 'Kamera-Zugriff verweigert';
        } else if (error.name === 'NotFoundError') {
            message = 'Keine Kamera gefunden';
        } else if (error.name === 'NotReadableError') {
            message = 'Kamera bereits in Verwendung';
        }
        
        this.updateCameraStatus(message);
    }

    // Timer System
    startExplorationTimer() {
        this.timerDisplay.style.display = 'block';
        this.workingTimer = setInterval(() => {
            this.workingTime--;
            this.updateTimerDisplay(this.workingTime);
            
            if (this.workingTime <= 0) {
                clearInterval(this.workingTimer);
                this.showWorksheetModal();
            }
        }, 1000);
    }

    updateTimerDisplay(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        this.timerText.textContent = display;
    }

    showWorksheetModal() {
        this.modalOverlay.style.display = 'flex';
        this.isExplorationPhase = false;
        
        // Start modal timer
        this.modalTimer = setInterval(() => {
            this.modalTime--;
            this.updateModalTimer(this.modalTime);
            
            if (this.modalTime <= 0) {
                clearInterval(this.modalTimer);
                this.showStationChangeMessage();
            }
        }, 1000);
    }

    updateModalTimer(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        document.getElementById('modalTimer').textContent = display;
    }

    showStationChangeMessage() {
        this.modalOverlay.style.display = 'none';
        this.stationChangeOverlay.style.display = 'flex';
    }
}

// Initialize the EVA Camera Station when page loads
document.addEventListener('DOMContentLoaded', () => {
    new EVACameraStation();
});