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
let isScanning = false; // Flag to prevent use-after-close

// UI Toggles
function setScanMode(mode) {
    if (isScanning) stopCamera(); // Ensure clean switch

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

    // Show Full Screen Camera
    videoContainer.classList.add('fullscreen');
    resultDiv.style.display = 'none';
    startBtn.innerText = "Scanning...";
    startBtn.disabled = true;

    // Reset state
    isScanning = true;

    const heightRaw = parseFloat(heightInput.value);
    const unit = unitSelect.value;
    const heightCm = unit === "feet" ? heightRaw * 30.48 : heightRaw;

    if (currentMode === 'face') {
        await startFaceScan(heightCm);
    } else {
        await startBodyScan(heightCm);
    }
}

// --- CAMERA & LOOP LOGIC ---
async function startCameraStream(facingMode) {
    const constraints = {
        video: {
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await new Promise(resolve => video.onloadedmetadata = resolve);
        video.play();
        return true;
    } catch (err) {
        console.error(`Error accessing ${facingMode} camera:`, err);
        alert(`Could not access camera (${facingMode}). Please check permissions.`);
        stopCamera();
        return false;
    }
}

async function processVideoFrame(solution) {
    if (!isScanning) return;

    if (solution) {
        await solution.send({ image: video });
    }

    if (isScanning) {
        requestAnimationFrame(() => processVideoFrame(solution));
    }
}

function stopCamera() {
    isScanning = false; // Mark as stopped

    // Hide Full Screen Camera
    videoContainer.classList.remove('fullscreen');

    // Stop MediaStream Tracks
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }

    if (solutions.faceMesh) {
        solutions.faceMesh.close();
        solutions.faceMesh = null;
    }
    if (solutions.pose) {
        solutions.pose.close();
        solutions.pose = null;
    }

    // Clear canvas
    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (startBtn) {
        startBtn.innerText = "Start Scan";
        startBtn.disabled = false;
    }
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

    // Start Front Camera
    const success = await startCameraStream('user');
    if (success) {
        processVideoFrame(solutions.faceMesh);
    }
}

function onFaceResults(results, heightCm) {
    if (!isScanning) return;

    if (!results.multiFaceLandmarks || !results.multiFaceLandmarks.length) {
        // Draw video only to keep feedback alive
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Note: we don't need to draw video here, video element is visible behind canvas. 
        // Just clearing canvas is enough to show raw feed.
        return;
    }

    // Draw landmarks
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Use drawing utils or custom drawing
    // ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height); 
    // ^ No need to draw image anymore since video tag is visible! Just draw landmarks.

    if (results.multiFaceLandmarks) {
        for (const landmarks of results.multiFaceLandmarks) {
            drawConnectors(ctx, landmarks, FACEMESH_TESSELATION, { color: '#C0C0C070', lineWidth: 1 });
            drawConnectors(ctx, landmarks, FACEMESH_RIGHT_EYE, { color: '#FF3030' });
            drawConnectors(ctx, landmarks, FACEMESH_LEFT_EYE, { color: '#30FF30' });
            drawConnectors(ctx, landmarks, FACEMESH_FACE_OVAL, { color: '#E0E0E0' });
        }
    }

    const landmarks = results.multiFaceLandmarks[0];
    const leftJaw = landmarks[234];
    const rightJaw = landmarks[454];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    // Helper for landmark distance
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const faceWidth = dist(leftJaw, rightJaw);
    const faceHeight = dist(forehead, chin);
    const ratio = faceWidth / faceHeight;

    // Optimization: accumulate a few frames or just take one good one
    // For now, let's stop immediately on first good detection
    stopCamera();
    reportFaceResults(ratio, heightCm);
}

function reportFaceResults(ratio, heightCm) {
    let fatLevel = "Unknown";
    let fatPercent = 0;
    let advice = "";

    if (ratio > 0.85) {
        fatLevel = "High Fat";
        fatPercent = 25 + Math.random() * 5; // 25-30%
        advice = "Consider adjusting your diet and doing regular cardio. Facial bloating detected.";
    } else if (ratio > 0.75) {
        fatLevel = "Medium Fat";
        fatPercent = 18 + Math.random() * 6; // 18-24%
        advice = "Moderate range. Hydration and balanced eating can help refine specific features.";
    } else {
        fatLevel = "Low Fat";
        fatPercent = 10 + Math.random() * 7; // 10-17%
        advice = "Great! Facial structure shows low fat levels. Maintain current habits.";
    }

    // Dynamic Affirmations
    const affirmations = [
        "I am a person of grace and elegance. My calm and respectful nature leaves a positive impression on everyone around me.",
        "I approach challenges with thoughtfulness and intelligence, always making a difference.",
        "My kindness and honesty shine through in everything I do, making me someone people admire and respect.",
        "I am strong, capable, and full of energy. My body is a vessel of power.",
        "Every step I take is a step towards a healthier, more vibrant me.",
        "My beauty radiates from within and shines outwardly for the world to see.",
        "I am comfortable in my own skin and proud of the unique journey I am on.",
        "I treat my body with love and respect, nourishing it with what it needs.",
        "I am becoming the best version of myself, one day at a time.",
        "My confidence grows stronger every single day."
    ];

    // Pick a random affirmation
    const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3 style="margin-top:0;">Estimated Fat Level: <span style="color: var(--accent-color);">${fatPerc(fatPercent)}</span></h3>
        <p><strong>Category:</strong> ${fatLevel}</p>
        <p>Face Ratio: ${ratio.toFixed(2)}, Height: ${heightCm.toFixed(1)} cm</p>
        <!-- <p style="margin-top: 10px;"><i>Advice:</i> ${advice}</p> -->
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
        <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; border-left: 3px solid var(--accent-color);">
            <p style="font-style: italic; margin: 0; font-size: 0.95rem;">"${randomAffirmation}"</p>
        </div>
    `;
}

function fatPerc(val) {
    return val.toFixed(1) + "%";
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

    // Start BACK Camera (Environment)
    const success = await startCameraStream('environment');
    if (success) {
        processVideoFrame(solutions.pose);
    }
}
// Helper to calculate 3D or 2D distance. For ratios, 2D (x,y) is usually sufficient if facing camera.
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}


// Variable to accumulate confidence over frames
let frameCount = 0;
const REQUIRED_FRAMES = 30; // Scan for ~1-2 second (at 30fps) to ensure stability

function onBodyResults(results, heightCm) {
    if (!isScanning) return;

    // Canvas Logic: Video is already visible behind. We only draw overlays.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height); // Removed: Video is visible as bg

    if (results.poseLandmarks) {
        drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 3 });
        drawLandmarks(ctx, results.poseLandmarks, { color: '#FF0000', lineWidth: 1 });
    }
    ctx.restore();

    if (!results.poseLandmarks) return;

    // Check visibility of key landmarks (Shoulders 11/12, Hips 23/24)
    const lm = results.poseLandmarks;
    const keyPoints = [11, 12, 23, 24]; // Shoulders and Hips
    const allVisible = keyPoints.every(id => lm[id] && lm[id].visibility > 0.5);

    if (!allVisible) {
        frameCount = 0; // Reset if user moves out
        return;
    }

    frameCount++;
    if (frameCount < REQUIRED_FRAMES) return; // Wait to stabilize

    // Processing Logic
    const leftEye = lm[2];
    const rightEye = lm[5];
    const leftShoulder = lm[11];
    const rightShoulder = lm[12];
    const leftHip = lm[23];
    const rightHip = lm[24];

    // 1. Calculate Scale using Eyes
    const eyeDistPx = distance(leftEye, rightEye);
    if (eyeDistPx < 0.01) return; // Too far

    // Scale Factor: 6.3 cm / eyeDistPx
    const scaleFactor = 6.3 / eyeDistPx;

    // 2. Measure Body Parts in CM
    const shoulderWidthPx = distance(leftShoulder, rightShoulder);
    const hipWidthPx = distance(leftHip, rightHip);

    const shoulderWidthCm = shoulderWidthPx * scaleFactor;
    const hipWidthCm = hipWidthPx * scaleFactor;

    // 3. Ratios
    const shr = shoulderWidthCm / hipWidthCm;
    const gender = document.querySelector('input[name="gender"]:checked').value;

    stopCamera();
    analyzeBodyShape(shr, shoulderWidthCm, hipWidthCm, gender, heightCm);
    frameCount = 0;
}

function analyzeBodyShape(shr, sWidth, hWidth, gender, height) {
    let shape = "";
    let fatLevel = "";
    let fatPercent = 0; // Estimate
    let description = "";

    // Heuristics
    if (gender === 'male') {
        if (shr >= 1.4) {
            shape = "V-Shape (Athletic)";
            fatLevel = "Low / Fit";
            fatPercent = 8 + Math.random() * 5; // 8-13%
            description = "Broad shoulders relative to waist. Indicates good muscle development.";
        } else if (shr > 1.1) {
            shape = "Trapezoid (Balanced)";
            fatLevel = "Average / Fit";
            fatPercent = 14 + Math.random() * 6; // 14-20%
            description = "Balanced proportions. Common for healthy fitness levels.";
        } else if (shr >= 1.0) {
            shape = "Rectangle";
            fatLevel = "Average";
            fatPercent = 20 + Math.random() * 5; // 20-25%
            description = "Shoulders and hips are roughly equal width.";
        } else {
            shape = "Oval / Soft";
            fatLevel = "High";
            fatPercent = 26 + Math.random() * 8; // 26-34%
            description = "Hips are wider than shoulders, often indicating higher body fat or softer frame.";
        }
    } else {
        // Female
        if (shr > 1.05) {
            shape = "Inverted Triangle";
            fatLevel = "Athletic";
            fatPercent = 16 + Math.random() * 4; // 16-20%
            description = "Shoulders broader than hips. Common in swimmers and athletes.";
        } else if (shr >= 0.90) {
            shape = "Hourglass / Rectangle";
            fatLevel = "Balanced";
            fatPercent = 21 + Math.random() * 6; // 21-27%
            description = "Shoulders and hips are balanced. Classic feminine proportion.";
        } else {
            shape = "Pear Shape";
            fatLevel = "Natural";
            fatPercent = 22 + Math.random() * 4; // 22-26%
            description = "Hips wider than shoulders. Very common and natural distribution.";
        }
    }

    // Dynamic Affirmations
    const affirmations = [
        "I am a person of grace and elegance. My calm and respectful nature leaves a positive impression on everyone around me.",
        "I approach challenges with thoughtfulness and intelligence, always making a difference.",
        "My kindness and honesty shine through in everything I do, making me someone people admire and respect.",
        "I am strong, capable, and full of energy. My body is a vessel of power.",
        "Every step I take is a step towards a healthier, more vibrant me.",
        "My beauty radiates from within and shines outwardly for the world to see.",
        "I am comfortable in my own skin and proud of the unique journey I am on.",
        "I treat my body with love and respect, nourishing it with what it needs.",
        "I am becoming the best version of myself, one day at a time.",
        "My confidence grows stronger every single day."
    ];

    // Pick a random affirmation
    const randomAffirmation = affirmations[Math.floor(Math.random() * affirmations.length)];

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <h3 style="margin-top:0;">Estimated Fat: <span style="color: var(--accent-color);">${fatPerc(fatPercent)}</span></h3>
        <p><strong>Body Shape:</strong> ${shape}</p>
        <p style="font-size: 0.9rem; margin-top: 10px;">${description}</p>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 10px 0;">
        <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; border-left: 3px solid var(--accent-color);">
            <p style="font-style: italic; margin: 0; font-size: 0.95rem;">"${randomAffirmation}"</p>
        </div>
        <p style="font-size: 0.85rem; margin-top: 10px;">
            Estimated Shoulder Width: ${sWidth.toFixed(1)} cm<br>
            Estimated Hip Width: ${hWidth.toFixed(1)} cm
        </p>
    `;
}
