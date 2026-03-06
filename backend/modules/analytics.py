"""
Analytics Module.

Generates emotion statistics, trend analysis, and alert thresholds.
"""

from typing import Dict, List, Tuple
from datetime import datetime


EMOTION_LABELS = ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"]
NEGATIVE_EMOTIONS = {"Angry", "Fear", "Sad", "Disgust"}


def compute_distribution(emotion_counts: Dict[str, int]) -> List[Dict]:
    """
    Compute emotion distribution percentages.

    Args:
        emotion_counts: Dict mapping emotion names to their counts.

    Returns:
        List of dicts with emotion, count, and percentage.
    """
    total = sum(emotion_counts.values())
    if total == 0:
        return [
            {"emotion": e, "count": 0, "percentage": 0.0}
            for e in EMOTION_LABELS
        ]

    return sorted(
        [
            {
                "emotion": emotion,
                "count": count,
                "percentage": round((count / total) * 100, 1),
            }
            for emotion, count in emotion_counts.items()
        ],
        key=lambda x: x["percentage"],
        reverse=True,
    )


def compute_trend(history: List[Dict]) -> Dict:
    """
    Compute emotion trends from historical data.

    Args:
        history: List of detection records with timestamp and emotion.

    Returns:
        Trend analysis with dominant emotion, shifts, and averages.
    """
    if not history:
        return {
            "dominant_emotion": "Neutral",
            "trend_direction": "stable",
            "avg_confidence": 0,
            "total_detections": 0,
        }

    # Count emotions
    counts: Dict[str, int] = {}
    total_conf = 0.0
    for entry in history:
        emotion = entry.get("emotion", "Neutral")
        counts[emotion] = counts.get(emotion, 0) + 1
        total_conf += entry.get("confidence", 0)

    dominant = max(counts, key=counts.get)  # type: ignore

    # Trend direction — compare first half vs second half
    mid = len(history) // 2
    first_half = history[:mid]
    second_half = history[mid:]

    first_negative = sum(1 for e in first_half if e.get("emotion") in NEGATIVE_EMOTIONS)
    second_negative = sum(1 for e in second_half if e.get("emotion") in NEGATIVE_EMOTIONS)

    if second_negative > first_negative * 1.3:
        direction = "worsening"
    elif second_negative < first_negative * 0.7:
        direction = "improving"
    else:
        direction = "stable"

    return {
        "dominant_emotion": dominant,
        "trend_direction": direction,
        "avg_confidence": round(total_conf / len(history), 1),
        "total_detections": len(history),
        "emotion_distribution": compute_distribution(counts),
    }


def check_alerts(
    emotion_counts: Dict[str, int],
    threshold: float = 30.0,
) -> List[Dict]:
    """
    Check if any negative emotions exceed the alert threshold.

    Args:
        emotion_counts: Dict mapping emotion names to counts.
        threshold: Percentage threshold for triggering alerts.

    Returns:
        List of alert dicts with emotion, percentage, and severity.
    """
    total = sum(emotion_counts.values())
    if total == 0:
        return []

    alerts = []
    for emotion in NEGATIVE_EMOTIONS:
        count = emotion_counts.get(emotion, 0)
        percentage = (count / total) * 100

        if percentage >= threshold:
            severity = "critical" if percentage >= 50 else "warning"
            alerts.append({
                "emotion": emotion,
                "percentage": round(percentage, 1),
                "count": count,
                "severity": severity,
                "message": f"High {emotion.lower()} emotion detected: {percentage:.1f}% of recent detections.",
                "timestamp": datetime.now().isoformat(),
            })

    return alerts


def generate_session_summary(
    emotion_counts: Dict[str, int],
    duration_seconds: int,
    total_faces: int,
) -> Dict:
    """
    Generate a summary for a detection session.

    Args:
        emotion_counts: Counts per emotion.
        duration_seconds: Session duration in seconds.
        total_faces: Total unique faces detected.

    Returns:
        Session summary dict.
    """
    distribution = compute_distribution(emotion_counts)
    dominant = distribution[0] if distribution else {"emotion": "Neutral", "percentage": 0}

    total = sum(emotion_counts.values())
    negative_pct = sum(
        emotion_counts.get(e, 0) for e in NEGATIVE_EMOTIONS
    ) / max(total, 1) * 100

    minutes = duration_seconds // 60
    seconds = duration_seconds % 60

    return {
        "duration": f"{minutes}m {seconds}s",
        "total_detections": total,
        "unique_faces": total_faces,
        "dominant_emotion": dominant["emotion"],
        "dominant_percentage": dominant["percentage"],
        "negative_emotion_pct": round(negative_pct, 1),
        "mood_assessment": (
            "Positive" if negative_pct < 20
            else "Mixed" if negative_pct < 50
            else "Concerning"
        ),
        "distribution": distribution,
    }
