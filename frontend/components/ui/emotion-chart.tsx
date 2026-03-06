"use client";

import { useEffect, useRef } from "react";

interface EmotionData {
    emotion: string;
    percentage: number;
    color: string;
}

interface EmotionChartProps {
    data: EmotionData[];
    title?: string;
}

const EMOTION_COLORS: Record<string, string> = {
    Happy: "#fbbf24",
    Sad: "#60a5fa",
    Angry: "#ef4444",
    Surprise: "#a78bfa",
    Fear: "#f97316",
    Disgust: "#10b981",
    Neutral: "#94a3b8",
};

export function EmotionBarChart({
    data,
    title = "Emotion Distribution",
}: EmotionChartProps) {
    return (
        <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">{title}</h3>
            <div className="space-y-3">
                {data.map((item) => (
                    <div key={item.emotion} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-16 shrink-0">
                            {item.emotion}
                        </span>
                        <div className="flex-1 h-6 bg-muted/30 rounded-full overflow-hidden relative">
                            <div
                                className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                                style={{
                                    width: `${Math.max(item.percentage, 0)}%`,
                                    backgroundColor: item.color,
                                    minWidth: item.percentage > 0 ? "4px" : "0px",
                                }}
                            >
                                <div className="absolute inset-0 animate-shimmer" />
                            </div>
                        </div>
                        <span className="text-xs font-mono font-semibold w-10 text-right">
                            {item.percentage}%
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function EmotionPieChart({ data }: EmotionChartProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const size = 200;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const cx = size / 2;
        const cy = size / 2;
        const outerRadius = 80;
        const innerRadius = 50;

        ctx.clearRect(0, 0, size, size);

        // Check if we have any data
        const total = data.reduce((sum, d) => sum + d.percentage, 0);

        if (total === 0) {
            // Draw empty ring
            ctx.beginPath();
            ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
            ctx.arc(cx, cy, innerRadius, Math.PI * 2, 0, true);
            ctx.closePath();
            ctx.fillStyle = "#1a2a4a";
            ctx.fill();

            // Center text
            ctx.fillStyle = "#7a8ba8";
            ctx.font = "13px Inter, system-ui";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("No data yet", cx, cy);
            return;
        }

        let startAngle = -Math.PI / 2;

        // Only draw slices with percentage > 0
        const activeData = data.filter((d) => d.percentage > 0);

        for (const item of activeData) {
            const sliceAngle = (item.percentage / total) * Math.PI * 2;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.arc(cx, cy, outerRadius, startAngle, endAngle);
            ctx.arc(cx, cy, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();

            // Gap between slices (only if more than one slice)
            if (activeData.length > 1) {
                ctx.beginPath();
                ctx.arc(cx, cy, outerRadius, endAngle - 0.02, endAngle + 0.02);
                ctx.arc(cx, cy, innerRadius, endAngle + 0.02, endAngle - 0.02, true);
                ctx.closePath();
                ctx.fillStyle = "#050a18";
                ctx.fill();
            }

            startAngle = endAngle;
        }

        // Center text — show top emotion
        const topEmotion = activeData.reduce(
            (max, d) => (d.percentage > max.percentage ? d : max),
            activeData[0]
        );

        if (topEmotion) {
            ctx.fillStyle = "#e8edf5";
            ctx.font = "bold 20px Inter, system-ui";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(`${topEmotion.percentage}%`, cx, cy - 8);

            ctx.font = "12px Inter, system-ui";
            ctx.fillStyle = "#7a8ba8";
            ctx.fillText(topEmotion.emotion, cx, cy + 14);
        }
    }, [data]);

    return (
        <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">
                Emotion Overview
            </h3>
            <div className="flex items-center justify-center">
                <canvas
                    ref={canvasRef}
                    className="w-[200px] h-[200px]"
                    style={{ width: 200, height: 200 }}
                />
            </div>
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-4">
                {data.map((item) => (
                    <div key={item.emotion} className="flex items-center gap-1.5">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                            {item.emotion}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function EmotionTimeline({
    data,
}: {
    data: { time: string; emotion: string; confidence: number }[];
}) {
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new entries appear
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [data.length]);

    return (
        <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 text-foreground">
                Detection Timeline
            </h3>
            <div
                ref={scrollRef}
                className="space-y-2 max-h-[300px] overflow-y-auto"
            >
                {data.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                        No detections yet. Start the camera to begin.
                    </p>
                ) : (
                    data.map((entry, i) => (
                        <div
                            key={`${i}-${entry.time}`}
                            className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
                        >
                            <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{
                                    backgroundColor:
                                        EMOTION_COLORS[entry.emotion] || "#94a3b8",
                                }}
                            />
                            <div className="flex-1">
                                <span className="text-xs font-medium">{entry.emotion}</span>
                                <span className="text-[10px] text-muted-foreground ml-2">
                                    {entry.confidence}%
                                </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                                {entry.time}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export function formatEmotionData(
    emotionCounts: Record<string, number>
): EmotionData[] {
    const total = Object.values(emotionCounts).reduce((a, b) => a + b, 0);

    const allEmotions = [
        "Happy",
        "Sad",
        "Angry",
        "Surprise",
        "Fear",
        "Disgust",
        "Neutral",
    ];

    if (total === 0) {
        return allEmotions.map((emotion) => ({
            emotion,
            percentage: 0,
            color: EMOTION_COLORS[emotion] || "#94a3b8",
        }));
    }

    return allEmotions
        .map((emotion) => ({
            emotion,
            percentage: Math.round(
                ((emotionCounts[emotion] || 0) / total) * 100
            ),
            color: EMOTION_COLORS[emotion] || "#94a3b8",
        }))
        .sort((a, b) => b.percentage - a.percentage);
}
