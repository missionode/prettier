// Initialize Face Detection
async function initializeFaceDetection() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  const video = document.getElementById('video');
  
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => video.srcObject = stream);
}

// Detect Face and Crop
async function detectFace() {
  const detections = await faceapi.detectAllFaces(
    video, new faceapi.TinyFaceDetectorOptions()
  );

  if (detections.length > 0) {
    const box = detections[0].box;
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = box.width;
    faceCanvas.height = box.height;

    const ctx = faceCanvas.getContext('2d');
    ctx.drawImage(video, box.x, box.y, box.width, box.height,
                  0, 0, box.width, box.height);
    return faceCanvas;
  }
  return null;
}

// RGB to LAB Conversion
function rgbToLab(r, g, b) {
  [r, g, b] = [r, g, b].map(c =>
    c > 0.04045 ? Math.pow((c + 0.055) / 1.055, 2.4) : c / 12.92
  );

  let x = r * 0.4124564 + g * 0.3575761 + b * 0.1804375;
  let y = r * 0.2126729 + g * 0.7151522 + b * 0.0721750;
  let z = r * 0.0193339 + g * 0.1191920 + b * 0.9503041;

  [x, y, z] = [x/0.95047, y/1.00000, z/1.08883].map(c =>
    c > 0.008856 ? Math.cbrt(c) : 7.787 * c + 16/116
  );

  return [
    (116 * y) - 16,
    500 * (x - y),
    200 * (y - z)
  ];
}

// Analyze Average Skin Tone
function analyzeSkinTone(faceCanvas) {
  const ctx = faceCanvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, faceCanvas.width, faceCanvas.height);
  const pixels = imageData.data;

  let total = [0, 0, 0], count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const [l, a, b] = rgbToLab(pixels[i]/255, pixels[i+1]/255, pixels[i+2]/255);

    if (l > 30 && l < 70) { // Midtone filter
      total[0] += l;
      total[1] += a;
      total[2] += b;
      count++;
    }
  }

  return count > 0 ? total.map(c => c / count) : null;
}

// Calculate Color Match %
function calculateMatch(userLab, targetLab) {
  const [l1, a1, b1] = userLab;
  const [l2, a2, b2] = targetLab;
  const deltaE = Math.sqrt((l2 - l1) ** 2 + (a2 - a1) ** 2 + (b2 - b1) ** 2);

  return Math.round(Math.max(0, 100 - (deltaE * 2)));
}

// Scan Face and Update Result
async function scanFace() {
  const faceCanvas = await detectFace();
  const resultDiv = document.getElementById('result');
  const nutritionLink = document.getElementById('nutritionLink');

  if (!faceCanvas) {
    resultDiv.textContent = "Face not detected. Try again.";
    nutritionLink.style.display = 'none';
    return;
  }

  const userLab = analyzeSkinTone(faceCanvas);
  if (!userLab) {
    resultDiv.textContent = "Skin analysis failed.";
    nutritionLink.style.display = 'none';
    return;
  }

  const matchPercent = calculateMatch(userLab, TARGET_LAB);
  localStorage.setItem('lastScan', matchPercent);

  resultDiv.textContent = `Match: ${matchPercent}%`;

  if (matchPercent < 80) {
    nutritionLink.style.display = 'block';
  } else {
    nutritionLink.style.display = 'none';
  }
}

// Example Target LAB (Universal Fair Tone Sample)
const TARGET_LAB = [80, 0, 5];  // Example values: adjust if needed

// Start when page loads
window.onload = initializeFaceDetection;
