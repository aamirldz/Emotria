"use client";

import { useRef, useEffect, useState } from "react";

// ── Types ──────────────────────────────────────────────────────────────

interface FaceResult {
    detection: {
        box: { x: number; y: number; width: number; height: number };
        score: number;
    };
    expressions: Record<string, number>;
}

export interface Detection {
    x: number;
    y: number;
    width: number;
    height: number;
    emotion: string;
    confidence: number;
    allExpressions: Record<string, number>;
}

interface WebcamFeedProps {
    onDetections?: (detections: Detection[]) => void;
    isActive: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────

const EMOTION_COLORS: Record<string, string> = {
    happy: "#fbbf24",
    sad: "#60a5fa",
    angry: "#ef4444",
    surprised: "#a78bfa",
    fearful: "#f97316",
    disgusted: "#10b981",
    neutral: "#94a3b8",
};

const EMOTION_DISPLAY: Record<string, string> = {
    happy: "Happy",
    sad: "Sad",
    angry: "Angry",
    surprised: "Surprise",
    fearful: "Fear",
    disgusted: "Disgust",
    neutral: "Neutral",
};

const EMOTION_EMOJI: Record<string, string> = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    surprised: "😲",
    fearful: "😨",
    disgusted: "🤢",
    neutral: "😐",
};

// ── Accuracy Engine ────────────────────────────────────────────────────
// Uses multiple techniques to maximize prediction accuracy:
// 1. Exponential moving average (EMA) to smooth frame-to-frame noise
// 2. Confidence-weighted voting — higher confidence frames count more
// 3. Histogram-based stability — tracks which emotion appears most often
// 4. Minimum confidence gate — ignores low-confidence predictions

class AccuracyEngine {
    // Rolling EMA smoothed scores per emotion
    private ema: Record<string, number> = {};
    // Count of times each emotion was the top prediction
    private voteHistogram: Record<string, number> = {};
    // Recent top-emotion history for stability voting
    private recentTopEmotions: string[] = [];
    // Params
    private alpha: number;
    private historyLength: number;
    private initialized = false;

    constructor(alpha = 0.3, historyLength = 12) {
        this.alpha = alpha;
        this.historyLength = historyLength;
    }

    /**
     * Feed in a new frame's raw expression scores.
     * Returns the most accurate emotion and smoothed scores.
     */
    update(
        rawExpressions: Record<string, number>,
        detectionConfidence: number
    ): { emotion: string; confidence: number; smoothed: Record<string, number> } {
        // Weight factor: higher detection confidence → trust this frame more
        const weight = Math.max(0.1, Math.min(1, detectionConfidence));
        const effectiveAlpha = this.alpha * weight;

        // Apply EMA smoothing
        const smoothed: Record<string, number> = {};
        for (const [emotion, score] of Object.entries(rawExpressions)) {
            if (!this.initialized) {
                smoothed[emotion] = score;
            } else {
                const prev = this.ema[emotion] || 0;
                smoothed[emotion] = effectiveAlpha * score + (1 - effectiveAlpha) * prev;
            }
        }
        this.ema = { ...smoothed };
        this.initialized = true;

        // Find the top emotion from smoothed scores
        let topEmotion = "neutral";
        let topScore = 0;
        for (const [emotion, score] of Object.entries(smoothed)) {
            if (score > topScore) {
                topScore = score;
                topEmotion = emotion;
            }
        }

        // Update vote histogram
        this.voteHistogram[topEmotion] = (this.voteHistogram[topEmotion] || 0) + 1;

        // Track recent top emotions for stability
        this.recentTopEmotions.push(topEmotion);
        if (this.recentTopEmotions.length > this.historyLength) {
            this.recentTopEmotions.shift();
        }

        // Stability check: if the EMA top emotion differs from the histogram
        // mode, prefer the histogram mode (most frequently seen emotion)
        let stableEmotion = topEmotion;
        if (this.recentTopEmotions.length >= 5) {
            const modeCounts: Record<string, number> = {};
            for (const e of this.recentTopEmotions) {
                modeCounts[e] = (modeCounts[e] || 0) + 1;
            }
            let modeEmotion = topEmotion;
            let maxCount = 0;
            for (const [e, c] of Object.entries(modeCounts)) {
                if (c > maxCount) {
                    maxCount = c;
                    modeEmotion = e;
                }
            }
            // Use the mode if it appeared in >40% of recent frames
            const modeRatio = maxCount / this.recentTopEmotions.length;
            if (modeRatio > 0.4) {
                stableEmotion = modeEmotion;
            }
        }

        const finalConfidence = Math.round(
            (smoothed[stableEmotion] || topScore) * 100
        );

        return {
            emotion: stableEmotion,
            confidence: Math.min(99, Math.max(1, finalConfidence)),
            smoothed,
        };
    }

    reset() {
        this.ema = {};
        this.voteHistogram = {};
        this.recentTopEmotions = [];
        this.initialized = false;
    }
}

// ── Component ──────────────────────────────────────────────────────────

export function WebcamFeed({ onDetections, isActive }: WebcamFeedProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraReady, setCameraReady] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [modelLoading, setModelLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [faceCount, setFaceCount] = useState(0);
    const [fps, setFps] = useState(0);
    const [detectorType, setDetectorType] = useState<string>("loading");
    const faceApiRef = useRef<typeof import("face-api.js") | null>(null);
    const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });
    const onDetectionsRef = useRef(onDetections);

    // One accuracy engine per face slot (up to 10 concurrent faces)
    const enginesRef = useRef<AccuracyEngine[]>(
        Array.from({ length: 10 }, () => new AccuracyEngine(0.3, 12))
    );

    useEffect(() => {
        onDetectionsRef.current = onDetections;
    }, [onDetections]);

    // ── Load all face-api.js models ───────────────────────────────────
    useEffect(() => {
        if (modelsLoaded || modelLoading) return;

        async function loadModels() {
            setModelLoading(true);
            try {
                const faceapi = await import("face-api.js");
                faceApiRef.current = faceapi;

                const MODEL_URL = "/models";

                // Try loading SSD MobileNet v1 first (most accurate)
                // Fall back to TinyFaceDetector if it fails
                let useSSD = false;
                try {
                    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
                    useSSD = true;
                    console.log("[Emotria] ✅ SSD MobileNet v1 loaded (high accuracy)");
                } catch {
                    console.log("[Emotria] SSD MobileNet not found, using TinyFaceDetector");
                    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                }

                // Load expression + landmark models in parallel
                await Promise.all([
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                ]);

                setDetectorType(useSSD ? "SSD MobileNet v1" : "TinyFaceDetector");
                setModelsLoaded(true);
                console.log("[Emotria] ✅ All models loaded. Detector:", useSSD ? "SSD" : "Tiny");
            } catch (err) {
                console.error("[Emotria] Model loading failed:", err);
                setError("Failed to load AI models. Please refresh.");
            } finally {
                setModelLoading(false);
            }
        }

        loadModels();
    }, [modelsLoaded, modelLoading]);

    // ── Start webcam at highest supported resolution ──────────────────
    useEffect(() => {
        if (!isActive) {
            setCameraReady(false);
            return;
        }

        let stream: MediaStream | null = null;
        let cancelled = false;

        async function startCamera() {
            try {
                // Request 720p for more facial detail → better accuracy
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user",
                        frameRate: { ideal: 30 },
                    },
                });
                if (cancelled) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        setCameraReady(true);
                        setError(null);
                        const vw = videoRef.current?.videoWidth || 0;
                        const vh = videoRef.current?.videoHeight || 0;
                        console.log(`[Emotria] Camera: ${vw}×${vh}`);
                    };
                }
            } catch {
                if (!cancelled) {
                    setError("Camera access denied. Enable camera in browser settings.");
                }
            }
        }

        startCamera();

        return () => {
            cancelled = true;
            if (stream) stream.getTracks().forEach((t) => t.stop());
            setCameraReady(false);
            enginesRef.current.forEach((e) => e.reset());
        };
    }, [isActive]);

    // ── Detection loop ────────────────────────────────────────────────
    useEffect(() => {
        if (!cameraReady || !modelsLoaded || !isActive) {
            if (detectIntervalRef.current) {
                clearInterval(detectIntervalRef.current);
                detectIntervalRef.current = null;
            }
            return;
        }

        const faceapi = faceApiRef.current;
        if (!faceapi) return;

        const useSSD = detectorType === "SSD MobileNet v1";

        async function detect() {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || !faceapi || video.readyState < 2) return;

            try {
                // Choose detector based on what loaded
                let results;
                if (useSSD) {
                    results = await faceapi
                        .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({
                            minConfidence: 0.3,
                        }))
                        .withFaceLandmarks()
                        .withFaceExpressions();
                } else {
                    results = await faceapi
                        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
                            inputSize: 416,
                            scoreThreshold: 0.35,
                        }))
                        .withFaceLandmarks()
                        .withFaceExpressions();
                }

                // Canvas setup
                const dw = video.clientWidth;
                const dh = video.clientHeight;
                canvas.width = dw;
                canvas.height = dh;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                ctx.clearRect(0, 0, dw, dh);

                const sx = dw / video.videoWidth;
                const sy = dh / video.videoHeight;

                const detections: Detection[] = [];

                for (let i = 0; i < (results as unknown as FaceResult[]).length; i++) {
                    const r = (results as unknown as FaceResult[])[i];
                    const box = r.detection.box;
                    const detScore = r.detection.score;

                    // Run through accuracy engine for stable, high-accuracy results
                    const engine = enginesRef.current[Math.min(i, 9)];
                    const { emotion, confidence, smoothed } = engine.update(
                        r.expressions,
                        detScore
                    );

                    const displayName = EMOTION_DISPLAY[emotion] || emotion;
                    const color = EMOTION_COLORS[emotion] || "#3b82f6";
                    const emoji = EMOTION_EMOJI[emotion] || "😐";

                    // Scale to display
                    const x = box.x * sx;
                    const y = box.y * sy;
                    const w = box.width * sx;
                    const h = box.height * sy;

                    // ── Draw detection overlay ─────────────────────────────

                    // Subtle face region fill
                    ctx.save();
                    ctx.globalAlpha = 0.06;
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, w, h);
                    ctx.globalAlpha = 1;
                    ctx.restore();

                    // Corner brackets with glow
                    ctx.strokeStyle = color;
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = color;
                    ctx.shadowBlur = 12;
                    const clen = Math.min(28, w * 0.2, h * 0.2);

                    const corners = [
                        // top-left
                        [x, y + clen, x, y, x + clen, y],
                        // top-right
                        [x + w - clen, y, x + w, y, x + w, y + clen],
                        // bottom-left
                        [x, y + h - clen, x, y + h, x + clen, y + h],
                        // bottom-right
                        [x + w - clen, y + h, x + w, y + h, x + w, y + h - clen],
                    ];
                    for (const [x1, y1, x2, y2, x3, y3] of corners) {
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.lineTo(x3, y3);
                        ctx.stroke();
                    }
                    ctx.shadowBlur = 0;

                    // ── Label pill ─────────────────────────────────────────
                    const label = `${emoji} ${displayName} ${confidence}%`;
                    ctx.font = "bold 13px Inter, system-ui, sans-serif";
                    const tw = ctx.measureText(label).width;
                    const px = 10;
                    const lh = 28;
                    const ly = y - lh - 6;
                    const lw = tw + px * 2;
                    const rr = 7;

                    // Rounded rect
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.moveTo(x + rr, ly);
                    ctx.lineTo(x + lw - rr, ly);
                    ctx.quadraticCurveTo(x + lw, ly, x + lw, ly + rr);
                    ctx.lineTo(x + lw, ly + lh - rr);
                    ctx.quadraticCurveTo(x + lw, ly + lh, x + lw - rr, ly + lh);
                    ctx.lineTo(x + rr, ly + lh);
                    ctx.quadraticCurveTo(x, ly + lh, x, ly + lh - rr);
                    ctx.lineTo(x, ly + rr);
                    ctx.quadraticCurveTo(x, ly, x + rr, ly);
                    ctx.closePath();
                    ctx.fill();

                    ctx.fillStyle = "#000";
                    ctx.textBaseline = "middle";
                    ctx.fillText(label, x + px, ly + lh / 2);

                    // ── Confidence bar ─────────────────────────────────────
                    const by = y + h + 4;
                    ctx.fillStyle = color + "25";
                    ctx.fillRect(x, by, w, 3);
                    ctx.fillStyle = color;
                    ctx.fillRect(x, by, w * (confidence / 100), 3);

                    // ── Top-3 emotion breakdown below the box ──────────────
                    const sorted = Object.entries(smoothed)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3);

                    ctx.font = "11px Inter, system-ui";
                    ctx.textBaseline = "top";
                    let ey = by + 8;
                    for (const [emo, score] of sorted) {
                        const pct = Math.round((score as number) * 100);
                        if (pct < 3) continue;
                        const dname = EMOTION_DISPLAY[emo] || emo;
                        const ecolor = EMOTION_COLORS[emo] || "#94a3b8";
                        ctx.fillStyle = ecolor + "aa";
                        ctx.fillText(`${dname}: ${pct}%`, x, ey);
                        ey += 14;
                    }

                    // Build detection object
                    detections.push({
                        x: Math.round(box.x),
                        y: Math.round(box.y),
                        width: Math.round(box.width),
                        height: Math.round(box.height),
                        emotion: displayName,
                        confidence,
                        allExpressions: Object.fromEntries(
                            Object.entries(smoothed).map(([k, v]) => [
                                EMOTION_DISPLAY[k] || k,
                                Math.round((v as number) * 100),
                            ])
                        ),
                    });
                }

                setFaceCount(detections.length);
                if (onDetectionsRef.current) {
                    onDetectionsRef.current(detections);
                }

                // FPS counter
                fpsCounterRef.current.frames++;
                const now = Date.now();
                if (now - fpsCounterRef.current.lastTime >= 1000) {
                    setFps(
                        Math.round(
                            (fpsCounterRef.current.frames * 1000) /
                            (now - fpsCounterRef.current.lastTime)
                        )
                    );
                    fpsCounterRef.current = { frames: 0, lastTime: now };
                }
            } catch (err) {
                console.error("[Emotria] Detection error:", err);
            }
        }

        // Detection interval: 120ms for SSD (~8 FPS), 150ms for Tiny (~7 FPS)
        const interval = useSSD ? 120 : 150;
        detectIntervalRef.current = setInterval(detect, interval);
        detect();

        return () => {
            if (detectIntervalRef.current) {
                clearInterval(detectIntervalRef.current);
                detectIntervalRef.current = null;
            }
        };
    }, [cameraReady, modelsLoaded, isActive, detectorType]);

    // ── Render ────────────────────────────────────────────────────────

    if (error) {
        return (
            <div className="w-full aspect-video flex items-center justify-center bg-card rounded-xl border border-border">
                <div className="text-center p-8">
                    <div className="text-4xl mb-4">📷</div>
                    <p className="text-sm text-destructive mb-2 font-medium">{error}</p>
                    <p className="text-xs text-muted-foreground">
                        Enable camera access in your browser settings.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black">
            {/* Status badges */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                <div className="flex items-center gap-2 glass px-3 py-1.5 rounded-full">
                    <span
                        className={`w-2 h-2 rounded-full ${cameraReady && modelsLoaded
                            ? "bg-emerald-400 animate-pulse"
                            : "bg-yellow-400 animate-pulse"
                            }`}
                    />
                    <span className="text-[10px] font-medium text-white/80">
                        {!isActive
                            ? "OFFLINE"
                            : !modelsLoaded
                                ? "Loading AI..."
                                : cameraReady
                                    ? "LIVE"
                                    : "Connecting..."}
                    </span>
                </div>

                {cameraReady && modelsLoaded && (
                    <>
                        <div className="glass px-2.5 py-1.5 rounded-full">
                            <span className="text-[10px] font-mono font-medium text-white/60">
                                {fps} FPS
                            </span>
                        </div>
                        <div className="glass px-2.5 py-1.5 rounded-full">
                            <span className="text-[10px] font-medium text-emerald-400/80">
                                {detectorType}
                            </span>
                        </div>
                    </>
                )}
            </div>

            {cameraReady && faceCount > 0 && (
                <div className="absolute top-3 right-3 z-10 glass px-3 py-1.5 rounded-full">
                    <span className="text-[10px] font-medium text-white/80">
                        👥 {faceCount} face{faceCount !== 1 ? "s" : ""}
                    </span>
                </div>
            )}

            <video
                ref={videoRef}
                className="w-full h-auto block"
                playsInline
                muted
                style={{ transform: "scaleX(-1)" }}
            />

            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: "scaleX(-1)" }}
            />

            {isActive && (!cameraReady || !modelsLoaded) && (
                <div className="absolute inset-0 flex items-center justify-center bg-card/90 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-sm font-medium text-foreground mb-1">
                            {modelLoading ? "Loading AI Models..." : "Starting Camera..."}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {modelLoading
                                ? "Initializing face detector + emotion models"
                                : "Waiting for camera permission"}
                        </p>
                    </div>
                </div>
            )}

            {!isActive && (
                <div className="w-full aspect-video flex items-center justify-center bg-card">
                    <div className="text-center">
                        <div className="text-5xl mb-4">🧠</div>
                        <p className="text-sm font-medium text-foreground mb-1">
                            AI Detection Ready
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Click &quot;Start Camera&quot; for real-time emotion detection
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
