"use client";

interface HistoryEntry {
    id: number;
    timestamp: string;
    emotion: string;
    confidence: number;
    personCount: number;
}

interface EmotionHistoryProps {
    entries: HistoryEntry[];
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

const EMOTION_EMOJIS: Record<string, string> = {
    Happy: "😊",
    Sad: "😢",
    Angry: "😠",
    Surprise: "😲",
    Fear: "😨",
    Disgust: "🤢",
    Neutral: "😐",
};

export function EmotionHistory({ entries }: EmotionHistoryProps) {
    // Compute summary stats
    const emotionCounts: Record<string, number> = {};
    for (const entry of entries) {
        emotionCounts[entry.emotion] = (emotionCounts[entry.emotion] || 0) + 1;
    }
    const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];
    const avgConfidence =
        entries.length > 0
            ? Math.round(entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length)
            : 0;

    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">Session History</h3>
                <span className="text-[10px] text-muted-foreground font-mono">
                    {entries.length} records
                </span>
            </div>

            {/* Summary stats */}
            {entries.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold">{entries.length}</p>
                        <p className="text-[10px] text-muted-foreground">Detections</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold">{avgConfidence}%</p>
                        <p className="text-[10px] text-muted-foreground">Avg Confidence</p>
                    </div>
                    <div className="bg-muted/20 rounded-lg p-3 text-center">
                        <p className="text-lg font-bold">
                            {dominantEmotion ? EMOTION_EMOJIS[dominantEmotion[0]] || "—" : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                            {dominantEmotion ? dominantEmotion[0] : "None"}
                        </p>
                    </div>
                </div>
            )}

            {/* History table */}
            <div className="max-h-[250px] overflow-y-auto">
                {entries.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-3xl mb-2">📋</div>
                        <p className="text-xs text-muted-foreground">
                            Session history will appear here.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-muted-foreground border-b border-border">
                                <th className="text-left py-2 font-medium">Time</th>
                                <th className="text-left py-2 font-medium">Emotion</th>
                                <th className="text-right py-2 font-medium">Confidence</th>
                                <th className="text-right py-2 font-medium">Persons</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries
                                .slice(-50)
                                .reverse()
                                .map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-b border-border/50 hover:bg-muted/10 transition-colors"
                                    >
                                        <td className="py-2 font-mono text-muted-foreground">
                                            {entry.timestamp}
                                        </td>
                                        <td className="py-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-2 h-2 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            EMOTION_COLORS[entry.emotion] || "#94a3b8",
                                                    }}
                                                />
                                                {entry.emotion}
                                            </div>
                                        </td>
                                        <td className="py-2 text-right font-mono">
                                            {entry.confidence}%
                                        </td>
                                        <td className="py-2 text-right">{entry.personCount}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
