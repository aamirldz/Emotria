"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { WebcamFeed } from "@/components/ui/webcam-feed";
import type { Detection } from "@/components/ui/webcam-feed";
import {
    EmotionBarChart,
    EmotionPieChart,
    EmotionTimeline,
    formatEmotionData,
} from "@/components/ui/emotion-chart";
import { EmotionHistory } from "@/components/ui/emotion-history";
import { AlertPanel, checkEmotionThresholds } from "@/components/ui/alert-panel";

const EMOTIONS = ["Happy", "Sad", "Angry", "Surprise", "Fear", "Disgust", "Neutral"];
const EMOTION_COLORS: Record<string, string> = {
    Happy: "#fbbf24",
    Sad: "#60a5fa",
    Angry: "#ef4444",
    Surprise: "#a78bfa",
    Fear: "#f97316",
    Disgust: "#10b981",
    Neutral: "#94a3b8",
};
const EMOTION_EMOJIS: Record<string, string> = {
    Happy: "😊",
    Sad: "😢",
    Angry: "😠",
    Surprise: "😲",
    Fear: "😨",
    Disgust: "🤢",
    Neutral: "😐",
};

interface Alert {
    id: string;
    emotion: string;
    message: string;
    timestamp: string;
    severity: "warning" | "critical";
}

interface HistoryEntry {
    id: number;
    timestamp: string;
    emotion: string;
    confidence: number;
    personCount: number;
}

interface TimelineEntry {
    time: string;
    emotion: string;
    confidence: number;
}

export default function Dashboard() {
    const [cameraActive, setCameraActive] = useState(false);
    const [emotionCounts, setEmotionCounts] = useState<Record<string, number>>({});
    const [totalDetections, setTotalDetections] = useState(0);
    const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
    const [sessionDuration, setSessionDuration] = useState(0);

    // Use refs for mutable values accessed in callbacks to avoid stale closures
    const historyIdRef = useRef(0);
    const totalDetectionsRef = useRef(0);
    const emotionCountsRef = useRef<Record<string, number>>({});
    const lastAlertTimeRef = useRef(0);

    // Session timer
    useEffect(() => {
        if (!cameraActive) return;
        const interval = setInterval(() => {
            setSessionDuration((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [cameraActive]);

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Use a stable callback reference that reads from refs, not stale state
    const handleDetections = useCallback((detections: Detection[]) => {
        setCurrentDetections(detections);
        if (detections.length === 0) return;

        // Update emotion counts using ref for accuracy
        const updatedCounts = { ...emotionCountsRef.current };
        for (const det of detections) {
            updatedCounts[det.emotion] = (updatedCounts[det.emotion] || 0) + 1;
        }
        emotionCountsRef.current = updatedCounts;
        setEmotionCounts({ ...updatedCounts });

        // Update total using ref
        totalDetectionsRef.current += detections.length;
        setTotalDetections(totalDetectionsRef.current);

        // Add to history and timeline
        const time = new Date().toLocaleTimeString();
        const newHistory: HistoryEntry[] = [];
        const newTimeline: TimelineEntry[] = [];

        for (const det of detections) {
            historyIdRef.current++;
            newHistory.push({
                id: historyIdRef.current,
                timestamp: time,
                emotion: det.emotion,
                confidence: det.confidence,
                personCount: detections.length,
            });
            newTimeline.push({
                time,
                emotion: det.emotion,
                confidence: det.confidence,
            });
        }

        setHistory((prev) => [...prev, ...newHistory].slice(-200));
        setTimeline((prev) => [...prev, ...newTimeline].slice(-30));

        // Check alerts at most every 3 seconds to avoid spam
        const now = Date.now();
        if (now - lastAlertTimeRef.current > 3000) {
            lastAlertTimeRef.current = now;
            const newAlerts = checkEmotionThresholds(
                updatedCounts,
                totalDetectionsRef.current
            );
            if (newAlerts.length > 0) {
                setAlerts((prev) => {
                    // Deduplicate by emotion
                    const existingEmotions = new Set(prev.map((a) => a.emotion));
                    const unique = newAlerts.filter((a) => !existingEmotions.has(a.emotion));
                    return [...unique, ...prev].slice(0, 10);
                });
            }
        }
    }, []); // No dependencies — uses refs instead

    const dismissAlert = (id: string) => {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    };

    const clearAlerts = () => setAlerts([]);

    const resetSession = () => {
        setEmotionCounts({});
        setTotalDetections(0);
        setCurrentDetections([]);
        setHistory([]);
        setTimeline([]);
        setAlerts([]);
        setSessionDuration(0);
        historyIdRef.current = 0;
        totalDetectionsRef.current = 0;
        emotionCountsRef.current = {};
        lastAlertTimeRef.current = 0;
    };

    const emotionData = formatEmotionData(emotionCounts);

    return (
        <div className="min-h-screen bg-background">
            {/* Top navigation */}
            <nav className="sticky top-0 z-50 glass border-b border-border">
                <div className="flex items-center justify-between px-4 md:px-6 py-3">
                    <div className="flex items-center gap-3 md:gap-4">
                        <Link href="/" className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                                    <line x1="9" y1="9" x2="9.01" y2="9" />
                                    <line x1="15" y1="9" x2="15.01" y2="9" />
                                </svg>
                            </div>
                            <span className="text-base font-bold tracking-tight">
                                Face<span className="gradient-text-blue">AI</span>
                            </span>
                        </Link>
                        <div className="w-px h-6 bg-border hidden sm:block" />
                        <span className="text-xs text-muted-foreground hidden sm:inline">Dashboard</span>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Session info */}
                        <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="font-mono">{formatDuration(sessionDuration)}</span>
                            <span>{totalDetections} detections</span>
                            <span>{currentDetections.length} faces</span>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={resetSession}
                                className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setCameraActive(!cameraActive)}
                                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${cameraActive
                                        ? "bg-destructive/20 text-destructive hover:bg-destructive/30 border border-destructive/30"
                                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                                    }`}
                            >
                                {cameraActive ? "⏹ Stop Camera" : "▶ Start Camera"}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Dashboard content */}
            <div className="p-4 md:p-6">
                {/* Quick stats bar */}
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mb-6">
                    {EMOTIONS.map((emotion) => {
                        const count = emotionCounts[emotion] || 0;
                        const pct = totalDetections > 0 ? Math.round((count / totalDetections) * 100) : 0;
                        return (
                            <div
                                key={emotion}
                                className="glass-card p-2.5 md:p-3 flex items-center gap-2 md:gap-3 hover:border-primary/20 transition-all"
                            >
                                <span className="text-lg md:text-xl">{EMOTION_EMOJIS[emotion]}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[9px] md:text-[10px] text-muted-foreground truncate">{emotion}</p>
                                    <p
                                        className="text-xs md:text-sm font-bold"
                                        style={{ color: EMOTION_COLORS[emotion] }}
                                    >
                                        {pct}%
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                    {/* Left column — Webcam + Multi-person + Timeline */}
                    <div className="lg:col-span-2 space-y-4 md:space-y-6">
                        <WebcamFeed onDetections={handleDetections} isActive={cameraActive} />

                        {/* Multi-person detection info */}
                        {currentDetections.length > 0 && (
                            <div className="glass-card p-4 md:p-5 animate-fade-in">
                                <h3 className="text-sm font-semibold mb-3">
                                    👥 Detected Persons ({currentDetections.length})
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {currentDetections.map((det, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/50"
                                        >
                                            <div
                                                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
                                                style={{
                                                    backgroundColor: (EMOTION_COLORS[det.emotion] || "#94a3b8") + "20",
                                                    color: EMOTION_COLORS[det.emotion] || "#94a3b8",
                                                }}
                                            >
                                                {EMOTION_EMOJIS[det.emotion] || "😐"}
                                            </div>
                                            <div className="flex-1">
                                                <p
                                                    className="text-sm font-semibold"
                                                    style={{ color: EMOTION_COLORS[det.emotion] || "#94a3b8" }}
                                                >
                                                    Person {i + 1}: {det.emotion}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-300"
                                                            style={{
                                                                width: `${det.confidence}%`,
                                                                backgroundColor: EMOTION_COLORS[det.emotion] || "#94a3b8",
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {det.confidence}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <EmotionTimeline data={timeline} />
                    </div>

                    {/* Right column — Charts + Alerts + History */}
                    <div className="space-y-4 md:space-y-6">
                        <EmotionPieChart data={emotionData} title="Emotion Overview" />
                        <EmotionBarChart data={emotionData} />
                        <AlertPanel
                            alerts={alerts}
                            onDismiss={dismissAlert}
                            onClearAll={clearAlerts}
                        />
                        <EmotionHistory entries={history} />
                    </div>
                </div>
            </div>
        </div>
    );
}
