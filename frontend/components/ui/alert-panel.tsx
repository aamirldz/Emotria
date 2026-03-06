"use client";

import { useState } from "react";

interface Alert {
    id: string;
    emotion: string;
    message: string;
    timestamp: string;
    severity: "warning" | "critical";
}

interface AlertPanelProps {
    alerts: Alert[];
    onDismiss?: (id: string) => void;
    onClearAll?: () => void;
}

const SEVERITY_STYLES = {
    warning: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        icon: "⚠️",
        text: "text-yellow-400",
    },
    critical: {
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        icon: "🚨",
        text: "text-red-400",
    },
};

export function AlertPanel({ alerts, onDismiss, onClearAll }: AlertPanelProps) {
    const [expanded, setExpanded] = useState(true);

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">Alerts</h3>
                    {alerts.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-semibold animate-pulse">
                            {alerts.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {alerts.length > 0 && onClearAll && (
                        <button
                            onClick={onClearAll}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <svg
                            className={`w-4 h-4 transition-transform ${expanded ? "" : "-rotate-90"}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {alerts.length === 0 ? (
                        <div className="text-center py-6">
                            <div className="text-2xl mb-2">✅</div>
                            <p className="text-xs text-muted-foreground">
                                No active alerts. System operating normally.
                            </p>
                        </div>
                    ) : (
                        alerts.map((alert) => {
                            const style = SEVERITY_STYLES[alert.severity];
                            return (
                                <div
                                    key={alert.id}
                                    className={`flex items-start gap-3 p-3 rounded-lg ${style.bg} border ${style.border}`}
                                >
                                    <span className="text-sm mt-0.5">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs font-medium ${style.text}`}>
                                            {alert.emotion} Detected
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {alert.message}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                                            {alert.timestamp}
                                        </p>
                                    </div>
                                    {onDismiss && (
                                        <button
                                            onClick={() => onDismiss(alert.id)}
                                            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

// Helper to check thresholds and generate alerts — with deduplication
export function checkEmotionThresholds(
    emotionCounts: Record<string, number>,
    totalDetections: number,
    threshold: number = 30
): Alert[] {
    const alerts: Alert[] = [];
    if (totalDetections < 5) return alerts; // Don't alert with too few detections

    const negativeEmotions = ["Angry", "Fear", "Sad", "Disgust"];

    for (const emotion of negativeEmotions) {
        const count = emotionCounts[emotion] || 0;
        const percentage =
            totalDetections > 0 ? Math.round((count / totalDetections) * 100) : 0;

        if (percentage >= threshold) {
            const severity = percentage >= 50 ? "critical" : "warning";
            alerts.push({
                id: `alert-${emotion}-${Date.now()}`,
                emotion,
                message: `${emotion} emotion at ${percentage}% frequency. Exceeds ${threshold}% threshold.`,
                timestamp: new Date().toLocaleTimeString(),
                severity,
            });
        }
    }

    return alerts;
}
