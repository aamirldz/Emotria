"""
FastAPI Main Server for Facial Expression Recognition System.

Endpoints:
  POST /api/detect       — Detect emotions in an uploaded image
  GET  /api/analytics    — Get emotion analytics
  GET  /api/history      — Get detection history
  GET  /api/alerts       — Get active alerts
  GET  /api/report/daily — Get daily emotion report
  GET  /api/report/weekly— Get weekly emotion trend
  WS   /ws/detect        — WebSocket for real-time frame streaming
"""

import io
import uuid
import asyncio
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from modules.face_detector import FaceDetector
from modules.emotion_classifier import EmotionClassifier
from modules.analytics import (
    compute_distribution,
    compute_trend,
    check_alerts,
    generate_session_summary,
)
from storage.database import EmotionDatabase

# ── Initialize app ──────────────────────────────────────────────────────
app = FastAPI(
    title="FaceAI — Emotion Recognition API",
    description="Real-time facial expression recognition and behavior analysis.",
    version="1.0.0",
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Initialize modules ─────────────────────────────────────────────────
face_detector = FaceDetector(scale_factor=1.1, min_neighbors=5, min_size=30)
emotion_classifier = EmotionClassifier()
database = EmotionDatabase()

# In-memory session tracking
session_emotion_counts: dict = {}
session_id_active: Optional[str] = None


# ── Helper ──────────────────────────────────────────────────────────────
def process_image(image_bytes: bytes) -> dict:
    """Process an image and return detection results."""
    # Decode image
    nparr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image is None:
        return {"error": "Invalid image", "detections": []}

    # Detect faces
    face_results = face_detector.extract_faces(image, padding=0.1)

    if not face_results:
        return {"detections": [], "face_count": 0}

    # Classify emotions for each face
    detections = []
    for i, (face_img, bbox) in enumerate(face_results):
        emotion, confidence, probabilities = emotion_classifier.predict(face_img)

        detection = {
            "person_id": i,
            "x": int(bbox[0]),
            "y": int(bbox[1]),
            "width": int(bbox[2]),
            "height": int(bbox[3]),
            "emotion": emotion,
            "confidence": round(confidence, 1),
            "probabilities": {
                label: round(prob, 1)
                for label, prob in zip(
                    ["Angry", "Disgust", "Fear", "Happy", "Sad", "Surprise", "Neutral"],
                    probabilities,
                )
            },
        }
        detections.append(detection)

        # Update session counts
        session_emotion_counts[emotion] = session_emotion_counts.get(emotion, 0) + 1

        # Store in database
        database.add_detection(
            emotion=emotion,
            confidence=confidence,
            person_id=i,
            session_id=session_id_active,
            face_bbox=bbox,
        )

    return {
        "detections": detections,
        "face_count": len(detections),
        "demo_mode": emotion_classifier.is_demo_mode,
    }


# ── Routes ──────────────────────────────────────────────────────────────
@app.get("/")
async def root():
    """API health check."""
    return {
        "status": "online",
        "service": "FaceAI Emotion Recognition API",
        "version": "1.0.0",
        "demo_mode": emotion_classifier.is_demo_mode,
    }


@app.post("/api/detect")
async def detect_emotions(file: UploadFile = File(...)):
    """
    Detect emotions in an uploaded image.

    Accepts: JPEG, PNG image file.
    Returns: List of detected faces with emotions and confidence scores.
    """
    contents = await file.read()
    result = process_image(contents)
    return JSONResponse(content=result)


@app.get("/api/analytics")
async def get_analytics(hours: int = Query(default=24, ge=1, le=168)):
    """Get emotion analytics for the specified time period."""
    # Get from database
    db_distribution = database.get_emotion_distribution(hours=hours)

    # Combine with current session
    combined = {**db_distribution}
    for emotion, count in session_emotion_counts.items():
        combined[emotion] = combined.get(emotion, 0) + count

    distribution = compute_distribution(combined)
    alerts = check_alerts(combined)

    total = sum(combined.values())

    return {
        "period_hours": hours,
        "total_detections": total,
        "distribution": distribution,
        "alerts": alerts,
        "demo_mode": emotion_classifier.is_demo_mode,
    }


@app.get("/api/history")
async def get_history(limit: int = Query(default=50, ge=1, le=500)):
    """Get recent detection history."""
    history = database.get_recent_detections(limit=limit)
    return {"history": history, "count": len(history)}


@app.get("/api/alerts")
async def get_alerts(threshold: float = Query(default=30.0, ge=5, le=90)):
    """Get active alerts based on emotion thresholds."""
    combined = {**session_emotion_counts}
    db_dist = database.get_emotion_distribution(hours=1)
    for emotion, count in db_dist.items():
        combined[emotion] = combined.get(emotion, 0) + count

    alerts = check_alerts(combined, threshold=threshold)
    return {"alerts": alerts, "threshold": threshold}


@app.get("/api/report/daily")
async def daily_report(date: Optional[str] = None):
    """Get daily emotion report."""
    report = database.get_daily_report(date=date)
    return report


@app.get("/api/report/weekly")
async def weekly_report():
    """Get weekly emotion trend report."""
    trend = database.get_weekly_trend()
    return {"weekly_trend": trend}


@app.post("/api/session/start")
async def start_session():
    """Start a new detection session."""
    global session_id_active, session_emotion_counts
    session_id_active = str(uuid.uuid4())
    session_emotion_counts = {}
    database.start_session(session_id_active)
    return {"session_id": session_id_active}


@app.post("/api/session/end")
async def end_session():
    """End the current detection session."""
    global session_id_active
    if session_id_active:
        database.end_session(session_id_active)
        summary = generate_session_summary(
            session_emotion_counts,
            duration_seconds=0,
            total_faces=sum(session_emotion_counts.values()),
        )
        session_id_active = None
        return {"summary": summary}
    return {"message": "No active session"}


# ── WebSocket for real-time detection ───────────────────────────────────
@app.websocket("/ws/detect")
async def websocket_detect(websocket: WebSocket):
    """
    WebSocket endpoint for real-time emotion detection.

    Client sends: JPEG image bytes
    Server responds: JSON with detection results
    """
    await websocket.accept()

    try:
        while True:
            # Receive image frame
            data = await websocket.receive_bytes()
            result = process_image(data)
            await websocket.send_json(result)
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close()


# ── Startup/Shutdown ───────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    """Run on server startup."""
    print("=" * 60)
    print("  FaceAI — Emotion Recognition API")
    print(f"  Demo mode: {emotion_classifier.is_demo_mode}")
    print("=" * 60)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
