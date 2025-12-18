const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const resultDiv = document.getElementById('result');
const heightInput = document.getElementById('heightInput');
const unitSelect = document.getElementById('unitSelect');
const videoContainer = document.getElementById('videoContainer');
const genderGroup = document.getElementById('genderSelect');
const instructionText = document.getElementById('instructionText');
const toggleBtns = document.querySelectorAll('.toggle-btn');
const startBtn = document.getElementById('startBtn');

let currentMode = 'face'; // 'face' or 'body'
let camera = null;
let solutions = {
    faceMesh: null,
    pose: null
};

// UI Toggles
function setScanMode(mode) {
    currentMode = mode;

    // Update Toggle UI
    toggleBtns.forEach(btn => btn.classList.remove('active'));
    if (mode === 'face') {
        toggleBtns[0].classList.add('active');
        genderGroup.style.display = 'none';
        instructionText.innerText = "Center your face in the camera. Ensure good lighting.";
    } else {
        toggleBtns[1].classList.add('active');
        genderGroup.style.display = 'flex';
        instructionText.innerText = "Stand back 6-8 feet. Ensure your full body (head to toe or at least hips) is visible.";
    }

    // Reset Result
    resultDiv.style.display = 'none';
    videoContainer.style.display = 'none';
    stopCamera();
}

async function startCamera() {
    if (!heightInput.value) {
        alert("Please enter your height.");
        return;
    }

    if (currentMode === 'body') {
        const gender = document.querySelector('input[name="gender"]:checked');
        if (!gender) {
            alert("Please select your gender for Body Scan.");
            return;
        }
    }

    videoContainer.style.display = 'block';
    resultDiv.style.display = 'none';
    startBtn.innerText = "Scanning...";
    startBtn.disabled = true;

    const heightRaw = parseFloat(heightInput.value);
    const unit = unitSelect.value;
    const heightCm = unit === "feet" ? heightRaw * 30.48 : heightRaw;

    if (currentMode === 'face') {
        await startFaceScan(heightCm);
    } else {
        await startBodyScan(heightCm);
    }
}

function stopCamera() {
    if (camera) {
        camera.stop();
        camera = null;
    }
    if (solutions.faceMesh) {
        solutions.faceMesh.close();
        solutions.faceMesh = null;
    }
    if (solutions.pose) {
        solutions.pose.close();
        solutions.pose = null;
    }
    startBtn.innerText = "Start Scan";
    startBtn.disabled = false;
}

// --- FACE SCAN LOGIC ---
async function startFaceScan(heightCm) {
    solutions.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    solutions.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
    });

    solutions.faceMesh.onResults((results) => onFaceResults(results, heightCm));

    camera = new Camera(video, {
        onFrame: async () => {
            await solutions.faceMesh.send({ image: video });
        },
        width: 640,
        height: 480,
    });

    await camera.start();
}

function onFaceResults(results, heightCm) {
    // Draw logic if needed (skipping for cleaner UI, just analyzing)
    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) return;

    const landmarks = results.multiFaceLandmarks[0];
    const leftJaw = landmarks[234];
    const rightJaw = landmarks[454];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    const faceWidth = distance(leftJaw, rightJaw);
    const faceHeight = distance(forehead, chin);
    const ratio = faceWidth / faceHeight;

    reportFaceResults(ratio, heightCm);
    stopCamera();
}

function reportFaceResults(ratio, heightCm) {
    let fatLevel = "Unknown";
    let advice = "";

    if (ratio > 0.85) {
        fatLevel = "High Fat";
        advice = "Consider adjusting your diet and doing regular cardio. Facial bloating detected.";
    } else if (ratio > 0.75) {
        fatLevel = "Medium Fat";
        advice = "Moderate range. Hydration and balanced eating can help refine specific features.";
    } else {
        fatLevel = "Low Fat";
        advice = "Great! Facial structure shows low fat levels. Maintain current habits.";
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3 style="margin-top:0;">Estimated Fat Level: <span style="color: var(--accent-color);">${fatLevel}</span></h3>
        <p>Face Ratio: ${ratio.toFixed(2)}, Height: ${heightCm.toFixed(1)} cm</p>
        <p style="margin-top: 10px;"><i>Advice:</i> ${advice}</p>
    `;
}


// --- BODY SCAN LOGIC ---
async function startBodyScan(heightCm) {
    solutions.pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    solutions.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    solutions.pose.onResults((results) => onBodyResults(results, heightCm));

    camera = new Camera(video, {
        onFrame: async () => {
            await solutions.pose.send({ image: video });
        },
        width: 640,
        height: 480,
    });

    await camera.start(); // This needs to be awaited
}
// Helper to calculate 3D or 2D distance. For ratios, 2D (x,y) is usually sufficient if facing camera.
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}


// Variable to accumulate confidence over frames
let frameCount = 0;
const REQUIRED_FRAMES = 15; // Scan for ~1 second to stabilize

function onBodyResults(results, heightCm) {
    if (!results.poseLandmarks) return;

    // Draw landmarks on canvas for user feedback
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
    drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });
    ctx.restore();

    // Check visibility of key landmarks (Shoulders 11/12, Hips 23/24)
    const lm = results.poseLandmarks;
    const keyPoints = [11, 12, 23, 24]; // Shoulders and Hips
    const allVisible = keyPoints.every(id => lm[id] && lm[id].visibility > 0.5);

    if (!allVisible) {
        // Just show feedback, don't finalize
        return;
    }

    frameCount++;
    if (frameCount < REQUIRED_FRAMES) return; // Wait for distinct frames

    // Processing Logic
    const leftEye = lm[2];
    const rightEye = lm[5];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftHip = lm[23];
    const rightHip = lm[24];

    // 1. Calculate Scale using Eyes (IPD = Inter-Pupillary Distance)
    // Avg IPD is approx 63mm (6.3cm)
    const eyeDistPx = distance(leftEye, rightEye);
    if (eyeDistPx < 0.01) return; // Too far or detection error

    // Scale Factor: cm per normalized unit (approximate)
    // Notes: MediaPipe coordinates are 0-1.
    // eyeDistPx here is actually in normalized units if we use raw coords.
    // Normalized Distance = distance(leftEye, rightEye)
    // Real Distance = 6.3 cm
    const scaleFactor = 6.3 / eyeDistPx; // 1 unit of normalized distance = X cm

    // 2. Measure Body Parts in CM
    const shoulderWidthPx = distance(leftShoulder, rightShoulder);
    const hipWidthPx = distance(leftHip, rightHip);

    const shoulderWidthCm = shoulderWidthPx * scaleFactor;
    const hipWidthCm = hipWidthPx * scaleFactor;

    // 3. Ratios
    const shr = shoulderWidthCm / hipWidthCm;
    const gender = document.querySelector('input[name="gender"]:checked').value;

    analyzeBodyShape(shr, shoulderWidthCm, hipWidthCm, gender, heightCm);
    stopCamera();
    frameCount = 0;
}

function analyzeBodyShape(shr, sWidth, hWidth, gender, height) {
    let shape = "";
    let fatLevel = "";
    let description = "";

    // Heuristics
    if (gender === 'male') {
        if (shr >= 1.4) {
            shape = "V-Shape (Athletic)";
            fatLevel = "Low / Fit";
            description = "Broad shoulders relative to waist. Indicates good muscle development.";
        } else if (shr > 1.1) {
            shape = "Trapezoid (Balanced)";
            fatLevel = "Average / Fit";
            description = "Balanced proportions. Common for healthy fitness levels.";
        } else if (shr >= 1.0) {
            shape = "Rectangle";
            fatLevel = "Average";
            description = "Shoulders and hips are roughly equal width.";
        } else {
            shape = "Oval / Soft";
            fatLevel = "High";
            description = "Hips are wider than shoulders, often indicating higher body fat or softer frame.";
        }
    } else {
        // Female
        if (shr > 1.05) {
            shape = "Inverted Triangle";
            fatLevel = "Athletic";
            description = "Shoulders broader than hips. Common in swimmers and athletes.";
        } else if (shr >= 0.90) {
            shape = "Hourglass / Rectangle";
            fatLevel = "Balanced";
            description = "Shoulders and hips are balanced. Classic feminine proportion.";
        } else {
            shape = "Pear Shape";
            fatLevel = "Natural";
            description = "Hips wider than shoulders. Very common and natural distribution.";
        }
    }

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3 style="margin-top:0;">Body Shape: <span style="color: var(--accent-color);">${shape}</span></h3>
        <p><strong>Fat Level Estimate: </strong> ${fatLevel}</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">${description}</p>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
        <p style="font-size: 0.85rem;">
            Estimated Shoulder Width: ${sWidth.toFixed(1)} cm<br>
            Estimated Hip Width: ${hWidth.toFixed(1)} cm
        </p>
    `;
}
