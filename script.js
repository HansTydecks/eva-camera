class EVACameraStation {
    constructor() {
        this.stream = null;
        this.video = document.getElementById('cameraPreview');
        this.canvas = document.getElementById('photoCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isCameraActive = false;
        this.currentFilter = 'none';
        
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
        
        // Apply filter to video and overlay
        this.video.className = `filter-${filterType}`;
        this.filterOverlay.className = `filter-overlay filter-${filterType}`;
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
            // Convert canvas to blob
            const blob = await new Promise(resolve => {
                this.canvas.toBlob(resolve, 'image/png');
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
                                body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                                img { max-width: 100%; max-height: 100%; }
                                @media print {
                                    body { margin: 0; }
                                    img { width: 100%; height: auto; }
                                }
                            </style>
                        </head>
                        <body>
                            <img src="${url}" alt="Aufgenommenes Foto" />
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